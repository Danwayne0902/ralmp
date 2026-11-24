<?php

return [
    /*
    | Request metrics are off in tests by default and can be disabled in any
    | environment by setting METRICS_ENABLED=false.
    */
    'enabled' => env('METRICS_ENABLED', true),
];
