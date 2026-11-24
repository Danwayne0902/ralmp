<?php

return [
    /*
    | Requests allowed per minute for one authenticated user (or one IP when
    | signed out). Chat polling and normal browsing both fit comfortably under
    | the default. Set this to 0 only in a controlled load-test environment.
    */
    'api_per_minute' => (int) env('API_RATE_LIMIT', 120),
];
