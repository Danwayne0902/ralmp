<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Small, dependency-free request counter.
 *
 * Counters are written to one Redis hash so two app replicas share the same
 * numbers and no per-route keys have to be scanned. When Redis is not the
 * cache driver (local file cache, tests) plain cache counters are used and
 * only the totals are available.
 */
class Metrics
{
    private const KEY = 'metrics:counters';
    private const TTL_SECONDS = 604800; // 7 days

    public static function record(Request $request, Response $response, float $startedAt): void
    {
        if (!config('metrics.enabled', true)) {
            return;
        }

        $route = $request->route();
        $uri = $route ? $route->uri() : 'unmatched';
        $method = strtoupper($request->method());
        $status = (string) $response->getStatusCode();
        $durationMs = max(0, (int) round((microtime(true) - $startedAt) * 1000));

        $fields = [
            'total' => 1,
            "req:{$method}:{$uri}:{$status}" => 1,
            "dur:{$method}:{$uri}" => $durationMs,
        ];

        if ($durationMs >= 1000) {
            $fields['slow'] = 1;
        }

        if (self::usesRedis()) {
            try {
                $redis = Redis::connection(config('cache.stores.redis.connection', 'cache'));
                $total = 0;

                foreach ($fields as $field => $amount) {
                    $value = $redis->hincrby(self::KEY, $field, $amount);
                    if ($field === 'total') {
                        $total = (int) $value;
                    }
                }

                // Refresh the expiry occasionally instead of on every request.
                if ($total > 0 && $total % 500 === 0) {
                    $redis->expire(self::KEY, self::TTL_SECONDS);
                }

                return;
            } catch (Throwable $e) {
                report($e);
                // Fall through to cache-backed counters.
            }
        }

        foreach ($fields as $field => $amount) {
            try {
                Cache::add("metrics:{$field}", 0, self::TTL_SECONDS);
                Cache::increment("metrics:{$field}", $amount);
            } catch (Throwable $e) {
                report($e);
                return;
            }
        }
    }

    public static function snapshot(): array
    {
        $counters = self::counters();
        $total = (int) ($counters['total'] ?? 0);
        $slow = (int) ($counters['slow'] ?? 0);
        $durationTotal = 0;
        $routes = [];

        foreach ($counters as $field => $value) {
            if (str_starts_with($field, 'req:')) {
                [, $method, $uri, $status] = array_pad(explode(':', $field, 4), 4, '');
                $routes[$method.' '.$uri] ??= [
                    'method' => $method,
                    'route' => $uri,
                    'count' => 0,
                    'duration_ms' => 0,
                    'statuses' => [],
                ];
                $routes[$method.' '.$uri]['count'] += (int) $value;
                $routes[$method.' '.$uri]['statuses'][$status] = (int) $value;
            } elseif (str_starts_with($field, 'dur:')) {
                [, $method, $uri] = array_pad(explode(':', $field, 3), 3, '');
                $routes[$method.' '.$uri] ??= [
                    'method' => $method,
                    'route' => $uri,
                    'count' => 0,
                    'duration_ms' => 0,
                    'statuses' => [],
                ];
                $routes[$method.' '.$uri]['duration_ms'] += (int) $value;
                $durationTotal += (int) $value;
            }
        }

        foreach ($routes as &$route) {
            $route['average_ms'] = $route['count'] > 0
                ? round($route['duration_ms'] / $route['count'], 1)
                : 0;
        }
        unset($route);

        usort($routes, fn ($a, $b) => $b['count'] <=> $a['count']);

        return [
            'source' => self::usesRedis() ? 'redis' : 'cache',
            'window_seconds' => self::TTL_SECONDS,
            'totals' => [
                'requests' => $total,
                'slow_requests' => $slow,
                'average_ms' => $total > 0 ? round($durationTotal / $total, 1) : 0,
            ],
            'routes' => $routes,
        ];
    }

    public static function prometheus(array $snapshot): string
    {
        $lines = [
            '# HELP ramlp_requests_total Requests handled since the counters were last cleared.',
            '# TYPE ramlp_requests_total counter',
            '# HELP ramlp_request_duration_ms Total request time in milliseconds.',
            '# TYPE ramlp_request_duration_ms counter',
            '# HELP ramlp_slow_requests_total Requests that took one second or longer.',
            '# TYPE ramlp_slow_requests_total counter',
        ];

        $lines[] = 'ramlp_requests_total ' . (int) ($snapshot['totals']['requests'] ?? 0);
        $lines[] = 'ramlp_slow_requests_total ' . (int) ($snapshot['totals']['slow_requests'] ?? 0);

        foreach ($snapshot['routes'] ?? [] as $route) {
            $labels = sprintf(
                'method="%s",route="%s"',
                self::escapeLabel($route['method']),
                self::escapeLabel($route['route']),
            );
            $lines[] = sprintf('ramlp_requests_total{%s} %d', $labels, (int) $route['count']);
            $lines[] = sprintf('ramlp_request_duration_ms{%s} %d', $labels, (int) $route['duration_ms']);

            foreach ($route['statuses'] as $status => $count) {
                $statusLabels = sprintf('%s,status="%s"', $labels, self::escapeLabel((string) $status));
                $lines[] = sprintf('ramlp_responses_total{%s} %d', $statusLabels, (int) $count);
            }
        }

        return implode("\n", $lines) . "\n";
    }

    private static function counters(): array
    {
        if (self::usesRedis()) {
            try {
                $counters = Redis::connection(config('cache.stores.redis.connection', 'cache'))
                    ->hgetall(self::KEY);

                if (is_array($counters)) {
                    return $counters;
                }
            } catch (Throwable $e) {
                report($e);
            }
        }

        return [
            'total' => (int) Cache::get('metrics:total', 0),
            'slow' => (int) Cache::get('metrics:slow', 0),
        ];
    }

    private static function usesRedis(): bool
    {
        return config('cache.default') === 'redis'
            && is_array(config('cache.stores.redis'));
    }

    private static function escapeLabel(string $value): string
    {
        return str_replace(["\\", "\n", '"'], ["\\\\", '\\n', '\\"'], $value);
    }
}
