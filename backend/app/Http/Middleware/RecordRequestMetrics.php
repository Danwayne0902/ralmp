<?php

namespace App\Http\Middleware;

use App\Support\Metrics;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordRequestMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('ramlp_started_at', microtime(true));

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $startedAt = (float) $request->attributes->get('ramlp_started_at', microtime(true));

        Metrics::record($request, $response, $startedAt);
    }
}
