<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Marketplace
    |--------------------------------------------------------------------------
    |
    | Flat delivery fee (in Naira) applied to every order. This is charged
    | server-side so clients cannot influence the amount they pay.
    |
    */

    'delivery_fee' => (float) env('RAMLP_DELIVERY_FEE', 2500),

    /*
    | Default lead time (in days) when a buyer does not pick a delivery date.
    */
    'default_delivery_days' => (int) env('RAMLP_DEFAULT_DELIVERY_DAYS', 3),
];
