# Load test

A small [k6](https://k6.io) script that measures the API instead of guessing.
It covers public marketplace browsing and, when credentials are supplied, the
signed-in inbox, orders and cart (including Redis-backed cart writes).

## What it does

- `browse` (default 10 VUs): listing pages, a listing detail, and search.
- `buyer` (default 5 VUs, only with credentials): conversation list, unread
  count, orders, cart, and an occasional cart add/remove.
- Thresholds: 95% of requests under 800 ms, 99% under 1500 ms, under 1%
  HTTP failures, and 99% of checks passing.
- `http_req_failed` counts 4xx/5xx responses. Repeated **429** responses mean
  the API rate limit was hit, not that the app is broken.

Results are written to `loadtest/results/summary.json`.

## Before you run it

1. Start the stack you want to measure (`docker compose up --build`).
2. Seed or create at least one available produce listing.
3. For the signed-in journey, use a buyer account that is email-verified.
4. Load-test environments should lift the API throttle, because the threshold
   is per user and a load generator deliberately exceeds normal traffic:
   ```sh
   API_RATE_LIMIT=0 docker compose up -d backend queue
   ```
   Leave the default (`120` requests per minute per user/IP) in production.
5. Never run a load test against an environment you do not own.

## Run

```sh
# Public browsing only
k6 run loadtest/k6.js

# Browsing plus a signed-in buyer
BASE_URL=http://127.0.0.1:8000/api/v1 \
K6_EMAIL=buyer@example.com \
K6_PASSWORD='your-password' \
k6 run loadtest/k6.js

# Longer run with more virtual users
BASE_URL=https://staging.example.com/api/v1 \
K6_EMAIL=buyer@example.com K6_PASSWORD='...' \
DURATION=5m READ_VUS=50 BUYER_VUS=25 \
k6 run loadtest/k6.js
```

Useful environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://127.0.0.1:8000/api/v1` | API base URL |
| `DURATION` | `1m` | Length of each scenario |
| `READ_VUS` | `10` | Virtual users browsing publicly |
| `BUYER_VUS` | `5` | Virtual users signed in |
| `WRITE_RATIO` | `0.1` | Share of buyer iterations that add then remove a cart item |

## Recorded baseline

One local run (November 2026) for reference, not a capacity claim:

```
BASE_URL=http://127.0.0.1:8000/api/v1 \
K6_EMAIL=buyer@ramlp.com K6_PASSWORD=... \
DURATION=30s READ_VUS=6 BUYER_VUS=3 WRITE_RATIO=0 \
k6 run loadtest/k6.js
```

- Host: 8-core i5, 16 GB RAM, macOS, MySQL 8.1, PHP 8.2 built-in server (4
  workers), Redis 7.4 on the same machine.
- Result: 598 requests, 0 failures, p95 140 ms, p99 205 ms, max 566 ms.
- Thresholds passed.

The built-in server is slower than nginx + PHP-FPM, so treat these numbers as a
floor for the request path, not a production estimate.

### nginx + PHP-FPM on the same machine

`loadtest/fpm.sh` starts the app behind nginx and PHP-FPM without Docker, using
the same pool size as `backend/docker/php-fpm.conf` and Redis for cache and
sessions. That measures the serving path the container actually uses.

```sh
loadtest/fpm.sh start

BASE_URL=http://127.0.0.1:8088/api/v1 \
K6_EMAIL=buyer@ramlp.com K6_PASSWORD=... \
DURATION=30s READ_VUS=6 BUYER_VUS=3 WRITE_RATIO=0 \
k6 run loadtest/k6.js

loadtest/fpm.sh stop
```

Same host and profile as the built-in-server run:

- 638 requests, 0 failures, 100% of checks passed
- p95 58 ms, p99 108 ms, max 382 ms

That is less than half the p95 of `artisan serve` on the same machine, which is
why the earlier run is a floor rather than an estimate. It is still one laptop
node with MySQL on the same disk, so it says nothing about staging capacity,
network latency or multiple app replicas.

## Reading the result

The thresholds answer the scalability question directly:

- If `p(95)` stays under 800 ms and failures under 1%, the current stack handles
  this load with headroom.
- If latency climbs with virtual users while CPU is low, look at database
  queries and indexes first.
- If latency climbs with CPU near the limit, add app replicas behind a load
  balancer before scaling the database.
- 429s are throttling. Re-run with `API_RATE_LIMIT` lifted for the test only.

Request counters from the same traffic are available to an admin at
`GET /api/v1/admin/metrics` (JSON) and
`GET /api/v1/admin/metrics?format=prometheus` (text).
