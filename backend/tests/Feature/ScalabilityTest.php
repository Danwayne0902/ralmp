<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\ProduceListing;
use App\Models\User;
use App\Support\ImageStore;
use App\Support\Metrics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ScalabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer', 'buyer', 'logistics_provider'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function user(string $role = 'buyer'): User
    {
        $user = User::factory()->create(['role' => $role]);
        $user->assignRole($role);

        return $user;
    }

    private function message(User $from, User $to, string $body, bool $read = false): Message
    {
        return Message::create([
            'sender_id' => $from->id,
            'recipient_id' => $to->id,
            'message' => $body,
            'is_read' => $read,
        ]);
    }

    public function test_the_inbox_returns_one_row_per_thread_with_its_latest_message(): void
    {
        $buyer = $this->user('buyer');
        $farmerA = $this->user('farmer');
        $farmerB = $this->user('farmer');

        $this->message($buyer, $farmerA, 'Hello, is the maize available?');
        $this->message($farmerA, $buyer, 'Yes, 40 bags are ready.');
        $this->message($buyer, $farmerB, 'Do you deliver to Aba?');

        Sanctum::actingAs($buyer);

        $response = $this->getJson('/api/v1/messages/conversations?per_page=50')
            ->assertOk()
            ->assertJsonCount(2, 'conversations');

        $threads = collect($response->json('conversations'))->keyBy('user.id');

        $this->assertSame('Yes, 40 bags are ready.', $threads[$farmerA->id]['last_message']['message']);
        $this->assertSame(1, $threads[$farmerA->id]['unread_count']);
        $this->assertSame('Do you deliver to Aba?', $threads[$farmerB->id]['last_message']['message']);
        $this->assertSame(0, $threads[$farmerB->id]['unread_count']);
    }

    public function test_message_history_is_paginated_in_both_directions(): void
    {
        $buyer = $this->user('buyer');
        $farmer = $this->user('farmer');

        $messages = collect(range(1, 5))->map(
            fn (int $i) => $this->message($buyer, $farmer, "Message {$i}"),
        );

        Sanctum::actingAs($buyer);

        $newest = $this->getJson("/api/v1/messages/{$farmer->id}?per_page=2")
            ->assertOk()
            ->assertJsonCount(2, 'messages')
            ->assertJsonPath('meta.has_more', true)
            ->json();

        $this->assertSame($messages[3]->id, $newest['meta']['oldest_id']);
        $this->assertSame($messages[4]->id, $newest['meta']['newest_id']);

        $older = $this->getJson(
            "/api/v1/messages/{$farmer->id}?per_page=2&before_id={$newest['meta']['oldest_id']}",
        )
            ->assertOk()
            ->assertJsonCount(2, 'messages')
            ->assertJsonPath('meta.has_more', true)
            ->json();

        $this->assertSame([$messages[1]->id, $messages[2]->id], collect($older['messages'])->pluck('id')->all());

        $oldest = $this->getJson(
            "/api/v1/messages/{$farmer->id}?per_page=2&before_id={$older['meta']['oldest_id']}",
        )
            ->assertOk()
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('meta.has_more', false)
            ->json();

        $this->assertSame($messages[0]->id, $oldest['messages'][0]['id']);

        // Polling asks only for messages newer than the last one on screen.
        $fresh = $this->message($farmer, $buyer, 'Message 6');
        $this->getJson("/api/v1/messages/{$farmer->id}?after_id={$messages[4]->id}&per_page=30")
            ->assertOk()
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.id', $fresh->id);
    }

    public function test_a_client_cannot_request_more_than_one_hundred_rows(): void
    {
        ProduceListing::factory()->count(120)->create();

        $response = $this->getJson('/api/v1/produce-listings?per_page=500')
            ->assertOk();

        $this->assertSame(100, $response->json('per_page'));
        $this->assertCount(100, $response->json('data'));
    }

    public function test_search_still_filters_by_the_indexed_columns(): void
    {
        ProduceListing::factory()->create(['commodity_name' => 'Fresh Tomatoes', 'description' => 'Ripe and firm']);
        ProduceListing::factory()->create(['commodity_name' => 'Dry Maize', 'description' => 'Yellow corn']);

        $this->getJson('/api/v1/produce-listings?search=Tomatoes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.commodity_name', 'Fresh Tomatoes');
    }

    public function test_the_health_probe_checks_the_database_and_cache(): void
    {
        $this->getJson('/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database', 'ok')
            ->assertJsonPath('checks.cache', 'ok');
    }

    public function test_uploads_follow_the_configured_disk(): void
    {
        Storage::fake('s3');
        config(['filesystems.uploads_disk' => 's3']);

        $path = ImageStore::put(UploadedFile::fake()->create('produce.jpg', 10, 'image/jpeg'), 'produce');

        Storage::disk('s3')->assertExists($path);

        ImageStore::delete($path);

        Storage::disk('s3')->assertMissing($path);
    }

    public function test_metrics_share_a_redis_hash_and_render_prometheus_text(): void
    {
        config([
            'cache.default' => 'redis',
            'cache.stores.redis' => ['driver' => 'redis', 'connection' => 'cache'],
        ]);

        Redis::shouldReceive('connection')->with('cache')->andReturnSelf();
        Redis::shouldReceive('hincrby')->andReturn(1);
        Redis::shouldReceive('expire')->zeroOrMoreTimes();
        Redis::shouldReceive('hgetall')->andReturn([
            'total' => '3',
            'slow' => '1',
            'req:GET:api/v1/produce-listings:200' => '3',
            'dur:GET:api/v1/produce-listings' => '450',
        ]);

        $request = Request::create('/api/v1/produce-listings', 'GET');
        $request->setRouteResolver(fn () => new Route('GET', 'api/v1/produce-listings', []));

        Metrics::record($request, response('', 200), microtime(true) - 0.1);

        $snapshot = Metrics::snapshot();

        $this->assertSame('redis', $snapshot['source']);
        $this->assertSame(3, $snapshot['totals']['requests']);
        $this->assertSame(150.0, $snapshot['totals']['average_ms']);

        $prometheus = Metrics::prometheus($snapshot);

        $this->assertStringContainsString(
            'ramlp_requests_total{method="GET",route="api/v1/produce-listings"} 3',
            $prometheus,
        );
        $this->assertStringContainsString('status="200"', $prometheus);
    }

    public function test_admin_can_read_request_metrics(): void
    {
        $admin = $this->user('admin');

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/produce-listings?per_page=5')->assertOk();

        $this->getJson('/api/v1/admin/metrics')
            ->assertOk()
            ->assertJsonStructure([
                'source',
                'window_seconds',
                'totals' => ['requests', 'slow_requests', 'average_ms'],
                'routes',
            ]);
    }

    public function test_metrics_are_admin_only(): void
    {
        Sanctum::actingAs($this->user('buyer'));

        $this->getJson('/api/v1/admin/metrics')->assertForbidden();
    }

    public function test_analytics_are_cached_and_can_be_refreshed(): void
    {
        $admin = $this->user('admin');

        Sanctum::actingAs($admin);

        $first = $this->getJson('/api/v1/admin/analytics')->assertOk()->json();
        $this->assertTrue(Cache::has('admin.analytics.v1'));

        // A new listing must not appear until the cache is bypassed.
        ProduceListing::factory()->create();

        $second = $this->getJson('/api/v1/admin/analytics')->assertOk()->json();
        $this->assertSame($first['total_listings'], $second['total_listings']);

        $fresh = $this->getJson('/api/v1/admin/analytics?fresh=1')->assertOk()->json();
        $this->assertSame($first['total_listings'] + 1, $fresh['total_listings']);
    }
}
