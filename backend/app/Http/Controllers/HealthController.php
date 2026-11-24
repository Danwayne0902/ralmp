<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Readiness probe used by the container healthcheck and load balancer.
     * It proves the database and the shared cache are reachable.
     */
    public function index(Request $request)
    {
        $checks = [];
        $healthy = true;

        try {
            DB::select('select 1');
            $checks['database'] = 'ok';
        } catch (Throwable $e) {
            $checks['database'] = 'failed';
            $healthy = false;
        }

        try {
            Cache::put('health:ping', 'ok', 10);
            $checks['cache'] = Cache::get('health:ping') === 'ok' ? 'ok' : 'failed';
            $healthy = $healthy && $checks['cache'] === 'ok';
        } catch (Throwable $e) {
            $checks['cache'] = 'failed';
            $healthy = false;
        }

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => $checks,
            'time' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }
}
