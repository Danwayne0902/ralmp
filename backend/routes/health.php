<?php

use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

// Deliberately registered without the web middleware group so a healthcheck
// never creates a session or touches cookies.
Route::get('/health', [HealthController::class, 'index']);
