# Rural Agricultural Market Linkage Platform (RAMLP)

A production-grade full-stack web application connecting farmers, buyers, logistics providers, and administrators across Nigeria's agricultural ecosystem.

## Tech Stack

### Backend
- **Framework**: Laravel 12 (PHP 8.2+)
- **Authentication**: Laravel Sanctum
- **Authorization**: Spatie Laravel Permission (RBAC)
- **Database**: MySQL 8.0+
- **Real-time**: Laravel Echo + Pusher/WebSockets
- **Queue**: Redis/Supervisor
- **Cache**: Redis

### Frontend
- **Framework**: React 19 (function components + hooks)
- **Router**: React Router 7
- **State Management**: Zustand 5
- **Styling**: Tailwind CSS 3 (design-token component layer)
- **UI & Motion**: framer-motion, lucide-react, sonner, recharts
- **Build Tool**: Vite 8
- **HTTP Client**: Axios

## Project Structure

```
RAMLP/
├── backend/                # Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/
│   │   │   ├── AuthController.php
│   │   │   ├── ProfileController.php
│   │   │   ├── ProduceListingController.php
│   │   │   ├── BuyerController.php
│   │   │   ├── OrderController.php
│   │   │   ├── CartController.php
│   │   │   ├── LogisticsController.php
│   │   │   └── AdminController.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── ProduceListing.php
│   │   │   ├── Order.php
│   │   │   ├── OrderItem.php
│   │   │   ├── Delivery.php
│   │   │   └── Message.php
│   │   └── Services/
│   ├── routes/api.php
│   ├── database/migrations/
│   └── .env
├── frontend/               # Original React 19 SPA (Vite) — rollback reference
├── frontend-react/         # AgroLink Continental React 19 SPA (current client)
│   ├── src/
│   │   ├── pages/          # Route-level screens
│   │   ├── components/     # App shells, layout and UI primitives
│   │   │   └── ui/
│   │   ├── store/          # Zustand stores (auth, cart)
│   │   ├── lib/            # api + service layer
│   │   └── App.jsx
│   ├── .oxlintrc.json
│   └── Dockerfile
├── docker-compose.yml
├── .github/
│   ├── workflows/ci.yml
│   └── copilot-instructions.md
└── README.md
```

## Quick Start

### Prerequisites
- PHP 8.2+
- Node.js 20+
- MySQL 8.0+
- Composer
- NPM

### Local Development

#### Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
Backend: `http://localhost:8000`

#### Frontend Setup
```bash
cd frontend-react
npm install
npm run dev
```
Frontend: `http://127.0.0.1:8081`

Create `frontend-react/.env` with the API and Paystack public key:

```
VITE_API_URL=http://127.0.0.1:8000/api/v1
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

### Frontend applications

Two React clients share the same Laravel API:

| App | Directory | Default port | Purpose |
| --- | --- | --- | --- |
| Original client | `frontend/` | 8081 | Pre-redesign screens, kept working as the rollback reference |
| AgroLink Continental | `frontend-react/` | 8081 | Current redesigned client (AgroLink design system) |

Run either one on 8081. To run both at once, move the original client to another port:

```bash
# terminal 1 — redesigned client
cd frontend-react && npm run dev        # http://127.0.0.1:8081

# terminal 2 — original client on a spare port
cd frontend && npm run dev -- --port 8082   # http://127.0.0.1:8082
```

Both apps read `VITE_API_URL`; each directory needs its own `.env` (the original
client already has one). The Laravel API runs independently on
`http://127.0.0.1:8000/api/v1`.

#### Rollback

The redesign is additive: `frontend/` has not been modified and no backend
contract changed. To roll back, stop the `frontend-react` dev server and start
the original client:

```bash
cd frontend && npm install && npm run dev   # http://127.0.0.1:8081
```

`frontend-react/` can then be ignored or removed without affecting the API or
the original client.

#### Accounts

There is no public demo login. Create your own account from the registration
page, or promote an existing user to admin:

```bash
php artisan tinker --execute="
\$u = App\Models\User::where('email', 'you@example.com')->firstOrFail();
\$u->update(['role' => 'admin', 'email_verified_at' => now(), 'is_active' => true]);
\$u->syncRoles(['admin']);
"
```

New registrations are signed in immediately. Email confirmation is optional and
is controlled by `AUTH_EMAIL_VERIFICATION` (off by default because the app must
work without a mail server).

The spot market is seeded with 23 lots across grains, legumes, tubers, vegetables,
fruits and spices from three co-op accounts. Listings were created through the public
API, so prices, volumes and units behave exactly like user-created lots. Category
artwork is illustrative, not lot photography.

#### How the money moves

Escrow release and payouts are real: money is split against the order, released
only when its proof arrives, and sent to the payee's saved bank account through
Paystack Transfers.

1. **Checkout** charges the goods only. The cart no longer adds a flat delivery fee.
2. **Delivery price** is negotiated in the order chat. A driver sends an offer,
   the buyer accepts or counters, and an accepted offer locks the amount, assigns
   that driver, and closes the other open offers.
3. **Delivery payment** is a second Paystack charge for the agreed amount, paid by
   the buyer before pickup and held in escrow.
4. **Goods release** happens in two moments. The first 10% is released at pickup.
   The other 60% and 30% are released together when the buyer confirms the goods
   arrived. Each release credits the farmer the net amount; the platform fee is
   recorded in `platform_fees` in the same transaction.
5. **Delivery release** needs both sides. The farmer confirms the handover and the
   buyer confirms the goods arrived. When the second confirmation lands, the
   driver's money is released automatically. If the delivery price is paid after
   both confirmations, it is released straight away.
6. **Payouts** go to the payee's saved bank account through Paystack Transfers and
   are marked paid only by a `transfer.success` webhook.
7. **Payments desk.** The admin desk lists only releases whose proof has arrived.
   Money that is still waiting is shown separately as not due, so it cannot be
   signed off early. Every release and bank-transfer action asks for confirmation,
   and a signed-off payment stays visible as released with its transfer state.

The platform fee is `RAMLP_PLATFORM_FEE_PERCENT`, clamped to 4–6 and 5 by default.
It is charged on goods and on delivery, and admins see the running total, the
month-to-date figure, the goods/delivery split and the recent fee rows under
**Payments → Platform fees**.

#### Presentation-only surfaces

The API has no endpoints for arbitration rulings, e-waybills or laboratory
assays. Those screens
(`/admin/arbitration`, `/dispatch/waybill`, `/buyer/procurement`) render the
control framework and derive their content from real order, listing and payment
records. Draft or unavailable data is labelled as such (for example "Draft
only — not decided", or an empty state) and no assay values, awards or
settlement references are invented.

The checker at `/admin/quality/terminal` is different: the readings and verdict
you enter are saved against the order in `quality_inspections`, with your name
and the time. It records a check; it does not release money, and it is not a
laboratory result. Payment release stays in the payments desk and follows the
buyer-confirmation rule above.

### Docker Setup

```bash
# Optionally copy .env.example to .env at the repo root and set DB_PASSWORD,
# APP_KEY, PAYSTACK_*, AWS_*, and VITE_API_URL before starting.
docker compose up --build -d
```

Services:
- Backend API (nginx + PHP-FPM): http://localhost:8000
- Queue worker (same image, runs `queue:work`)
- Frontend (AgroLink Continental): http://localhost:8080
- MySQL: localhost:3306
- Redis: localhost:6379

The backend image no longer runs `php artisan serve`. It runs nginx and PHP-FPM
under supervisor, and the queue worker uses the same image with a different
command. Cache, sessions, carts and queued jobs all use Redis, so two backend
replicas see the same cart and session instead of separate local files.

The web container waits for MySQL and Redis, runs migrations once, seeds the
roles and permissions needed for registration, links local storage, and builds
the Laravel config/view caches. The worker waits for the web container to become
healthy before starting. When `APP_KEY` is not set, the stack generates one on
first boot in the shared `app_keys` volume so the web and queue containers
agree; set `APP_KEY` yourself in production. Check logs with:

```bash
docker compose logs -f backend queue
docker compose ps
```

`frontend-react/` is the default `frontend` service. The pre-redesign client is
kept as an opt-in rollback service on port 8082:

```bash
docker compose --profile legacy up --build -d frontend-legacy
# Legacy client: http://localhost:8082
```

Vite inlines `VITE_*` variables at build time, so `VITE_API_URL`,
`VITE_ASSET_URL`, and `VITE_PAYSTACK_PUBLIC_KEY` must be set in the root `.env`
before `docker compose build`. For a browser talking to the containerised API,
the default `http://localhost:8000/api/v1` is correct. Set `VITE_ASSET_URL` to
the CDN origin when uploads live in S3.

## API Endpoints

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `POST /auth/verify-email` - Verify email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Profile
- `GET /profile` - Get profile
- `PUT /profile` - Update profile
- `POST /profile/change-password` - Change password

### Produce Listings
- `GET /produce-listings` - List commodities
- `GET /produce-listings/{id}` - Get commodity details
- `POST /produce-listings` - Create listing (farmer)
- `PUT /produce-listings/{id}` - Update listing
- `DELETE /produce-listings/{id}` - Delete listing
- `GET /farmer/listings` - Farmer's listings
- `GET /farmer/earnings` - Farmer earnings

### Buyer
- `GET /commodities/search` - Search commodities
- `GET /commodities/{id}` - Commodity details
- `GET /buyer/dashboard` - Buyer dashboard
- `GET /buyer/orders` - Order history
- `GET /buyer/saved-suppliers` - Saved suppliers

### Orders
- `GET /orders` - List orders
- `GET /orders/{id}` - Order details
- `POST /orders` - Create order
- `PUT /orders/{id}/status` - Update status
- `POST /orders/{id}/cancel` - Cancel order

### Cart
- `GET /cart` - Get cart (prices and totals resolved server-side)
- `POST /cart/add` - Add item (`produce_id`, `quantity`)
- `PUT /cart/update` - Update item
- `DELETE /cart/remove` - Remove item
- `DELETE /cart/clear` - Clear cart

### Payments (Paystack)
- `POST /payment/initialize` - Start a payment for an order
- `POST /payment/verify` - Verify a payment reference
- `GET /payment/history` - Payment history for the authenticated user
- `POST /payment/webhook` - Paystack webhook (HMAC SHA512 signature, no auth)

### Logistics
- `GET /logistics/deliveries` - List deliveries
- `POST /logistics/deliveries/{id}/assign` - Assign delivery
- `PUT /logistics/deliveries/{id}/status` - Update status
- `GET /logistics/track/{id}` - Track delivery
- `GET /logistics/estimate-cost` - Estimate cost

### Admin
- `GET /admin/users` - List users
- `PUT /admin/users/{id}/role` - Update role
- `GET /admin/commodities` - Monitor commodities
- `GET /admin/orders` - Monitor orders
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/analytics` - Analytics
- `GET /admin/market-insights` - Market insights

## Features Implemented

✅ **Authentication & Security**
- Multi-role registration (Farmer, Buyer, Logistics Provider, Admin)
- Email verification
- Password reset
- Role-based access control (RBAC)
- Sanctum API token authentication
- JWT-style tokens

✅ **Farmer Module**
- Create & manage produce listings
- Product images upload
- Inventory tracking
- Earnings dashboard
- Order management
- Real-time notifications

✅ **Buyer Module**
- Search & filter commodities (5+ filters)
- Bulk ordering
- Shopping cart (7-day cache TTL)
- Order history & tracking
- Saved suppliers
- Reviews & ratings (held for moderation)

✅ **Logistics Module**
- Drivers bid and counter-offer the delivery price in the order chat
- An accepted offer locks the price and assigns the driver
- The buyer pays the agreed delivery price into escrow before the order can close
- Delivery money is released only after the buyer and the farmer both confirm
- Delivery assignment & tracking
- Real-time tracking updates
- Driver management
- Pickup scheduling
- Status updates (6 statuses)

✅ **Admin Dashboard**
- User management
- Role management
- Commodity monitoring
- Transaction oversight
- Analytics & reports
- Market insights
- Platform configuration

✅ **Order & Marketplace**
- Server-authoritative pricing and totals (client prices are ignored)
- Stock validation and reservation in DB transactions
- Multi-farmer carts split into one order per farmer
- Checkout charges goods only; delivery is agreed with a driver afterwards
- Platform fee of 4–6% (5% by default) on released goods and delivery money
- Order lifecycle (8 statuses) with stock restoration on cancel/reject
- Price transparency

✅ **Frontend**
- 20+ lazy-loaded routes (route-level code splitting)
- Authentication pages (login, register)
- Role-based dashboard dispatcher
- Service layer modules
- Zustand state management
- Tailwind CSS design-system components
- Responsive, accessible UI

## Database Schema

**Tables**: users, roles, permissions, model_has_roles, model_has_permissions, produce_listings, orders, order_items, deliveries, delivery_offers, messages, payments, escrow_releases, payouts, platform_fees, and supporting tables.

**Key Relationships**:
- Users → Roles (Many-to-Many)
- Users → ProduceListings (One-to-Many)
- Users → Orders (Buyer/Farmer polymorphic)
- Orders → OrderItems (One-to-Many)
- Orders → Deliveries (One-to-One)
- Deliveries → LogisticsProvider (User)

## Environment Configuration

### Backend (.env)
```
APP_NAME=RAMLP
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:...
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ramlp
DB_USERNAME=root
DB_PASSWORD=secret

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
BROADCAST_DRIVER=log   # use "pusher" when a Pusher-compatible server runs

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null

# Images use the public disk locally; production points this at S3 and puts a
# CDN in front of AWS_URL.
FILESYSTEM_DISK=local
UPLOADS_DISK=public
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_URL=
AWS_ENDPOINT=
AWS_VISIBILITY=private
AWS_USE_PATH_STYLE_ENDPOINT=false

# Requests per minute per user or IP. 0 disables throttling (load tests only).
API_RATE_LIMIT=120
METRICS_ENABLED=true

# Require new accounts to confirm their email. The message is queued, so the
# worker must be running.
AUTH_EMAIL_VERIFICATION=false

MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_FROM_ADDRESS=no-reply@ramlp.test

# Paystack (server-side secret; never expose this to the browser)
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PAYMENT_URL=https://api.paystack.co

# Marketplace rules
# Platform fee taken from released goods and delivery money. Clamped to 4–6.
RAMLP_PLATFORM_FEE_PERCENT=5
# Legacy flat delivery fee, kept for older orders. Checkout no longer charges it.
RAMLP_DELIVERY_FEE=2500
RAMLP_DEFAULT_DELIVERY_DAYS=3
```

### Frontend (.env)
Vite only exposes variables prefixed with `VITE_`:
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_ASSET_URL=
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

`VITE_ASSET_URL` is the public origin for uploaded images. Leave it empty in
local development; in production set it to the CDN domain.

For the Docker frontend, pass the API URL as a build arg:
```bash
docker compose build --build-arg VITE_API_URL=https://api.example.com/api/v1 frontend
```

### Paystack Webhook
Register `https://<your-host>/api/v1/payment/webhook` in the Paystack
dashboard. The endpoint verifies the `x-paystack-signature` header
(HMAC SHA512 with `PAYSTACK_SECRET_KEY`), checks the amount and currency
against the order, and only then marks the payment and order as paid. It is
idempotent, so repeated deliveries are safe. The same path handles the second
payment for an agreed delivery price; those payments are matched to the delivery
instead of the order total.

The same URL also receives payout events. When an admin clicks **Send money**,
the API creates a Paystack transfer recipient from the payee's saved bank
details and starts a transfer. The payout is marked **paid** only when Paystack
sends `transfer.success`; `transfer.failed` and `transfer.reversed` leave it
pending with the reason, ready to retry. Transfers need the **Transfers**
permission on the Paystack account and enough money in the balance.

Payees add their bank account under **Profile → Payout account**. The bank list
comes from Paystack, so the bank codes always match the ones used for transfers.

## Deployment

### Production Checklist
- [ ] Set `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Generate one unique `APP_KEY` and give the same value to the web and queue containers (or mount it as a secret file)
- [ ] Move `APP_KEY`, `DB_PASSWORD` and payment/AWS keys out of plain environment variables (`scripts/secrets-init.sh` + `docker-compose.secrets.yml`, or your secret manager)
- [ ] Enable HTTPS/SSL and set `SESSION_SECURE_COOKIE=true`
- [ ] Use MySQL with backups; add a read replica when reporting queries get heavy
- [ ] Schedule `scripts/db-backup.sh` and prove a restore with `scripts/db-restore.sh`; keep a copy off the database host
- [ ] Run Redis for cache, sessions, carts and queues
- [ ] Run at least one queue worker (the compose file includes one)
- [ ] Configure a real mail transport
- [ ] Decide whether new accounts must verify email (`AUTH_EMAIL_VERIFICATION`); queued mail needs the worker
- [ ] Set `PAYSTACK_SECRET_KEY`, enable Transfers and register the webhook URL
- [ ] Fund the Paystack balance used for farmer and transporter payouts
- [ ] Create an S3-compatible bucket, set `UPLOADS_DISK=s3` and `AWS_*`, and put a CDN in front of `AWS_URL`
- [ ] Keep the bucket private and grant the CDN read access (OAI/OAC), or set `AWS_VISIBILITY=public` deliberately
- [ ] Set `VITE_ASSET_URL` to the CDN origin before building the frontend
- [ ] Run `docker compose exec backend php artisan uploads:check` after pointing uploads at S3
- [ ] Configure Pusher/Soketi and set `BROADCAST_DRIVER=pusher`
- [ ] Run more than one backend replica behind a load balancer (remove the fixed `8000:8000` port mapping, or put nginx/ALB in front)
- [ ] Restrict CORS to the real frontend origin
- [ ] Keep the default API throttle (`API_RATE_LIMIT=120`); monitor `/health` from outside the host and scrape `/api/v1/admin/metrics?format=prometheus`
- [ ] Ship container logs to a log store; `LOG_CHANNEL=stderr` is already set in the image
- [ ] Do not run the demo `DatabaseSeeder` in production; the entrypoint runs the idempotent `PermissionsSeeder` (roles + permissions) on boot

### Docker Production Build
```bash
APP_KEY=base64:... docker compose up --build -d
```

The image builds the Laravel config and view caches at boot, so no manual
`php artisan config:cache` step is needed. Only the web container runs
migrations and seeds access rows (`RUN_MIGRATIONS=1`); additional replicas
should set `RUN_MIGRATIONS=0` so they do not race.

### Object storage and CDN

With `UPLOADS_DISK=s3`, produce photos and profile images go straight to the
bucket and the database stores only the object key. The frontend turns that key
into a URL with `VITE_ASSET_URL`, so browsers load images from the CDN instead
of the API.

1. Create a bucket in the region you serve from.
2. Point the backend at it:
   ```bash
   UPLOADS_DISK=s3
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_DEFAULT_REGION=eu-west-1
   AWS_BUCKET=ramlp-uploads
   AWS_VISIBILITY=private
   AWS_URL=https://cdn.example.com
   ```
3. Put a CDN in front of the bucket. On CloudFront, use an origin access
   control (OAC) so CloudFront can read the private bucket while the bucket
   stays closed to the public. `AWS_URL` is the CDN origin. Without a CDN,
   either make the bucket public (`AWS_VISIBILITY=public`) or images will not
   load.
4. Set `VITE_ASSET_URL=https://cdn.example.com` and rebuild the frontend; Vite
   bakes it in at build time.
5. Verify from inside the app container:
   ```bash
   docker compose exec backend php artisan uploads:check
   ```
   It writes, reads back and deletes a small object, prints the object URL, and
   fails with a clear message when the bucket, credentials or region are wrong.

The API receives uploads itself, so the bucket needs no browser CORS rules.
Object keys are random and uploads carry a one-year immutable `Cache-Control`
header, so the CDN can cache them indefinitely without serving stale images.

### Database backups

`scripts/db-backup.sh` dumps the database with `mysqldump --single-transaction`
(no table locks), compresses it, and checks both gzip integrity and the
`Dump completed` marker before it keeps the file. It uses a local `mysqldump`
when one is installed and otherwise runs the dump inside the compose `mysql`
container.

```bash
# Local copy in ./backups, kept for 14 days
scripts/db-backup.sh

# Also copy each backup off the host (needs the aws CLI)
BACKUP_S3_URI=s3://ramlp-backups/mysql scripts/db-backup.sh

# Nightly at 02:15 with cron
15 2 * * * cd /srv/ramlp && BACKUP_S3_URI=s3://ramlp-backups/mysql scripts/db-backup.sh >> /var/log/ramlp-backup.log 2>&1
```

Settings come from the environment or `backend/.env`: `DB_HOST`, `DB_PORT`,
`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, plus `BACKUP_RETENTION_DAYS`
(default 14) and `BACKUP_S3_URI`.

A backup nobody restored is not a backup. `scripts/db-restore.sh` restores into
`<database>_restore` by default, compares every table's row count with the live
database and reports the result:

```bash
scripts/db-restore.sh backups/ramlp-20261125T020000Z.sql.gz
scripts/db-restore.sh backups/ramlp-20261125T020000Z.sql.gz ramlp_restore --strict
```

Restoring over the live database needs `--force`. Run a restore drill after
changing MySQL versions or backup destinations, and keep a copy off the
database host: a disk failure takes the local dumps with it.

### Secrets

Compose passes configuration as environment variables, which anyone with Docker
access can read with `docker inspect`. For production, move at least `APP_KEY`
and `DB_PASSWORD` into files:

```bash
# Writes ./secrets/app_key and ./secrets/db_password (owner-only)
scripts/secrets-init.sh

docker compose -f docker-compose.yml -f docker-compose.secrets.yml up -d
```

The entrypoint accepts `<VAR>_FILE` for `APP_KEY`, `DB_PASSWORD`,
`REDIS_PASSWORD`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`, `MAIL_PASSWORD`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `PUSHER_APP_SECRET`, so the same
pattern works with a Kubernetes secret volume or a systemd `LoadCredential=`
mount. Add entries to `docker-compose.secrets.yml` as you move more values.

`backend/.env` remains the local source for `scripts/secrets-init.sh`; keep it
at mode 600 and never commit it. If a cloud secret manager is available, inject
the variables at boot instead of keeping a file on disk.

Rotate `APP_KEY` deliberately: changing it logs everyone out and makes
previously encrypted values unreadable.

### Monitoring

`GET /health` checks the database and the shared cache and returns `503` with
`"status":"degraded"` when either fails, so it is the right endpoint for an
external monitor. Point the monitor at both the API and the frontend, at
one-minute intervals, and alert to email and chat.

For a self-hosted check, `scripts/health-watch.sh` probes `/health`, retries,
and posts to a Slack-compatible webhook only when the state changes:

```bash
# Cron every minute
* * * * * cd /srv/ramlp && ALERT_WEBHOOK=https://hooks.slack.com/services/... scripts/health-watch.sh >> /var/log/ramlp-health.log 2>&1
```

`HEALTH_URL`, `HEALTH_RETRIES`, `HEALTH_DELAY`, `HEALTH_TIMEOUT` and
`HEALTH_STATE_FILE` tune it. It exits 0 when healthy and 1 when not, so a
systemd timer or another monitor can consume the result too.

`/health` cannot see queue depth, disk space or the S3 bucket. Check those from
the host (disk) and from the queue:

```bash
# Exits non-zero when more than 1000 jobs are waiting.
docker compose exec -T queue php artisan queue:monitor redis:default --max=1000
```

Scrape `/api/v1/admin/metrics?format=prometheus` for request rate, error statuses
and slow requests.

## Testing

```bash
# Backend feature/unit tests (SQLite in-memory; see phpunit.xml)
cd backend && php artisan test

# One suite
cd backend && php artisan test --testsuite=Feature

# Frontend lint and production build
cd frontend-react && npm run lint
cd frontend-react && npm run build

# Load test (needs k6; see loadtest/README.md)
k6 run loadtest/k6.js
```

CI runs four jobs on every push and pull request
(`.github/workflows/ci.yml`): backend tests, both frontend builds, and a Docker
stack smoke test. The stack job builds the production image, boots MySQL +
Redis + nginx/PHP-FPM + the queue worker, checks `/health`, confirms nginx is
serving the API, registers a user whose verification email must be delivered by
the worker, then dumps the database and restores it into a second database with
matching row counts. That catches image, compose, migration, queue and backup
regressions that the SQLite test suite cannot see.

## Troubleshooting

### Backend
- Clear cache: `php artisan cache:clear`
- Regenerate config: `php artisan config:cache`
- Run migrations: `php artisan migrate`

### Frontend
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf dist && npm run build`
- Check API URL in `.env`

## Scalability

The stack is designed for a regional pilot that can grow to several backend
replicas. This section records what is already handled and what still limits it,
so capacity decisions can be checked against evidence rather than guessed.

### Shared state and background work
- Cache, sessions, carts and queued jobs use Redis (`CACHE_DRIVER=redis`,
  `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis`).
- `docker-compose.yml` runs a dedicated `queue` container from the same image.
  Verification, password-reset, order-status and payout mail implement
  `ShouldQueue`, so delivery runs in the worker instead of the request. With
  `QUEUE_CONNECTION=sync` in local development they still send immediately.
- Redis uses append-only persistence. A local restart test confirmed the cache
  entry and the session value were still readable after `SHUTDOWN` and a fresh
  `redis-server` start on the same data directory.

### Chat and indexes
- The inbox returns one row per conversation, using `MAX(id)` per
  `conversation_id`, plus one grouped unread query. It no longer loads every
  message the user has ever exchanged.
- Message history is paginated: `per_page`, `before_id` for older pages, and
  `after_id` for polling only new messages. The frontend loads 30 at a time and
  has a **Load earlier messages** control.
- Migration `2026_11_23_000001` backfills `conversation_id` and adds indexes on
  `messages(conversation_id, id)`, `messages(recipient_id, is_read)`,
  `messages(sender_id, created_at)`, order status/payment dates, and marketplace
  filters.

### Search and admin analytics
- MySQL gets a `FULLTEXT` index on
  `produce_listings(commodity_name, description, category)`.
  `App\Support\Search` uses `MATCH … AGAINST` on MySQL and falls back to `LIKE`
  on SQLite, so tests keep working.
- Admin analytics are cached for five minutes under `admin.analytics.v1`.
  `GET /api/v1/admin/analytics?fresh=1` bypasses the cache when an admin needs
  current numbers.

### Pagination and uploads
- `ClampPerPage` limits every `per_page` query parameter to 1–100.
- Uploads go through `App\Support\ImageStore`, controlled by `UPLOADS_DISK`.
  Local development keeps the public disk; production uses S3-compatible
  storage. Replaced and deleted images are removed from storage. S3 objects are
  private by default, ready for a CDN with origin access; set
  `AWS_VISIBILITY=public` only for a deliberately public bucket.
- The frontend resolves images through `VITE_ASSET_URL`, so a CDN origin can be
  used without code changes.

### Serving and observability
- The backend image runs nginx + PHP-FPM under supervisor instead of
  `php artisan serve`, with opcache and a tuned FPM pool.
- `GET /health` checks the database and shared cache and is used by the
  container healthcheck.
- Every API request is counted by `RecordRequestMetrics`. Admins can read
  `GET /api/v1/admin/metrics` (JSON) or
  `GET /api/v1/admin/metrics?format=prometheus` (text). Counters are stored in
  Redis so replicas share one view and the response includes per-route latency.
  With the local file cache only the request and slow-request totals are kept.
- `loadtest/k6.js` measures listing browsing and the signed-in inbox/orders/cart
  against a running environment, with latency and failure thresholds.

### Measured baseline

A 30-second run with 6 public and 3 signed-in virtual users, Redis for
cache/cart/metrics, MySQL 8.1 and PHP's built-in server with four workers
(PHP 8.2, 8-core i5, 16 GB) produced:

- 598 requests, 0 HTTP failures
- p95 140 ms, p99 205 ms, max 566 ms

Cart writes were disabled for that run (`WRITE_RATIO=0`) to keep the sample
stable. This proves the script and the normal request path end to end; it is not
a benchmark of the nginx + PHP-FPM image, and the built-in server is slower than
FPM. Run `loadtest/k6.js` against the deployed stack for capacity numbers.

### What still limits scale
- Only the web tier is stateless. MySQL is still a single primary; add a read
  replica before reporting or analytics traffic grows.
- Chat is polled every four seconds when a thread is open. A websocket service
  (Pusher/Soketi) is the next step for large concurrent chat usage.
- The API throttle is per user/IP (`API_RATE_LIMIT=120`). Raise it deliberately
  or run a load test with it lifted.
- There is no autoscaling or multi-region setup. Those are deployment choices,
  not requirements for a pilot.

## Security Features

- Bcrypt password hashing
- Framework and packages on supported releases (Laravel 12); `composer audit`
  reports no known advisories
- Sanctum API token protection
- Role-based authorization on orders, deliveries, payments, and admin routes
- Hashed email-verification and password-reset tokens with expiry
- Unverified and suspended accounts cannot log in
- Server-authoritative pricing, totals, and stock (no trust in client payloads)
- Paystack webhook HMAC SHA512 signature and amount verification
- Public endpoints expose only whitelisted farmer profile fields
- Parameterized SQL queries (Eloquent ORM)
- CSRF protection
- XSS prevention via React escaping
- Input validation on all forms
- Secure file uploads

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push branch: `git push origin feature/your-feature`
4. Open pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue
- Email: support@ramlp.com

---

**Last Updated**: November 24, 2026
**Version**: 1.0.0