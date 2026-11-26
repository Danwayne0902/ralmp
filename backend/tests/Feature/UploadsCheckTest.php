<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadsCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_writes_reads_and_removes_a_test_object(): void
    {
        Storage::fake('s3');
        config(['filesystems.uploads_disk' => 's3']);

        $this->artisan('uploads:check')->assertSuccessful();

        $this->assertSame([], Storage::disk('s3')->allFiles('health'));
    }

    public function test_it_uses_the_configured_disk(): void
    {
        Storage::fake('public');
        config(['filesystems.uploads_disk' => 'public']);

        $this->artisan('uploads:check')->assertSuccessful();

        $this->assertSame([], Storage::disk('public')->allFiles('health'));
    }

    public function test_it_fails_when_the_disk_is_not_configured(): void
    {
        config(['filesystems.uploads_disk' => 'missing-disk']);

        $this->artisan('uploads:check')
            ->expectsOutputToContain('is not configured')
            ->assertFailed();
    }
}
