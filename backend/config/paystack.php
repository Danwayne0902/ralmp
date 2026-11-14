<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Paystack
    |--------------------------------------------------------------------------
    |
    | Credentials for the Paystack payment gateway. The secret key is used
    | server-side only; the public key is exposed to the frontend via the
    | VITE_PAYSTACK_PUBLIC_KEY environment variable.
    |
    */

    'publicKey' => env('PAYSTACK_PUBLIC_KEY'),

    'secretKey' => env('PAYSTACK_SECRET_KEY'),

    'paymentUrl' => env('PAYSTACK_PAYMENT_URL', 'https://api.paystack.co'),

    'merchantEmail' => env('PAYSTACK_MERCHANT_EMAIL', env('MAIL_FROM_ADDRESS')),

    /*
    |--------------------------------------------------------------------------
    | Webhook
    |--------------------------------------------------------------------------
    |
    | Paystack signs webhook payloads with the secret key (HMAC SHA512).
    |
    */

    'webhookTolerance' => (int) env('PAYSTACK_WEBHOOK_TOLERANCE', 300),
];
