<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform fee
    |--------------------------------------------------------------------------
    |
    | Percentage kept by the platform from every released payment part, both
    | goods and delivery. Clamped to the agreed 4-6% range so a bad env value
    | cannot silently overcharge.
    |
    */

    'platform_fee_percent' => (float) env('RAMLP_PLATFORM_FEE_PERCENT', 5),

    /*
    |--------------------------------------------------------------------------
    | Legacy flat delivery fee
    |--------------------------------------------------------------------------
    |
    | Delivery is now negotiated with a driver after the order is placed, so
    | checkout no longer charges this. It is kept so old orders and tests that
    | still carry a delivery fee keep working.
    |
    */

    'delivery_fee' => (float) env('RAMLP_DELIVERY_FEE', 2500),

    /*
    | Default lead time (in days) when a buyer does not pick a delivery date.
    */
    'default_delivery_days' => (int) env('RAMLP_DEFAULT_DELIVERY_DAYS', 3),
];
