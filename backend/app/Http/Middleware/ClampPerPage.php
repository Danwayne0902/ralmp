<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClampPerPage
{
    /**
     * Keep pagination bounded. Without this a client can ask for every row
     * in a table (or an invalid page size) on any paginated endpoint.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->query->has('per_page')) {
            $value = (int) $request->query('per_page');

            if ($value < 1) {
                $value = 15;
            }

            $request->query->set('per_page', min($value, 100));
        }

        return $next($request);
    }
}
