# Rural Agricultural Market Linkage Platform (RAMLP)

A production-grade full-stack web application connecting farmers, buyers, logistics providers, and administrators across Nigeria's agricultural ecosystem.

## Tech Stack

### Backend
- **Framework**: Laravel 10 (PHP 8.1+)
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
├── backend/                # Laravel 10 API
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
- PHP 8.1+
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

The platform fee is `RAMLP_PLATFORM_FEE_PERCENT`, clamped to 4–6 and 5 by default.
It is charged on goods and on delivery, and admins see the running total, the
month-to-date figure, the goods/delivery split and the recent fee rows under
**Payments → Platform fees**.

#### Presentation-only surfaces

The API has no endpoints for arbitration rulings, e-waybills
or laboratory assays. Those screens
(`/admin/arbitration`, `/admin/quality/terminal`, `/dispatch/waybill`,
`/buyer/procurement`) render the control framework and
derive their content from real order, listing and payment records. Draft or
unavailable data is labelled as such (for example "Draft only — not decided",
or an empty state) and no assay values, awards or settlement references are
invented.

### Docker Setup

```bash
# Optionally copy .env.example to .env at the repo root and set DB_PASSWORD,
# APP_KEY, PAYSTACK_*, and VITE_API_URL before starting.
docker compose up --build -d
```

Services:
- Backend API: http://localhost:8000
- Frontend (AgroLink Continental): http://localhost:8080
- MySQL: localhost:3306
- Redis: localhost:6379

The backend image generates a `.env` and `APP_KEY` on first boot when they are
not supplied, waits for MySQL, runs migrations, and links storage. Both frontend
images compile to static assets and are served by nginx.

`frontend-react/` is the default `frontend` service. The pre-redesign client is
kept as an opt-in rollback service on port 8082:

```bash
docker compose --profile legacy up --build -d frontend-legacy
# Legacy client: http://localhost:8082
```

Vite inlines `VITE_*` variables at build time, so `VITE_API_URL` and
`VITE_PAYSTACK_PUBLIC_KEY` must be set in the root `.env` before
`docker compose build`. For a browser talking to the containerised API, the
default `http://localhost:8000/api/v1` is correct.

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
QUEUE_CONNECTION=sync
BROADCAST_DRIVER=log   # use "pusher" when a Pusher-compatible server runs

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
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

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
- [ ] Generate a unique `APP_KEY` and keep it secret
- [ ] Enable HTTPS/SSL
- [ ] Configure MySQL with backups
- [ ] Set up Redis for caching/queues
- [ ] Configure a real mail transport
- [ ] Set `PAYSTACK_SECRET_KEY`, enable Transfers and register the webhook URL
- [ ] Fund the Paystack balance used for farmer and transporter payouts
- [ ] Configure Pusher/Soketi and set `BROADCAST_DRIVER=pusher`
- [ ] Run `php artisan config:cache route:cache`
- [ ] Configure Supervisor for queues
- [ ] Set up Nginx reverse proxy
- [ ] Restrict CORS to the real frontend origin

### Docker Production Build
```bash
docker-compose -f docker-compose.yml up -d
```

## Testing

```bash
# Backend feature/unit tests (SQLite in-memory; see phpunit.xml)
cd backend && php artisan test

# One suite
cd backend && php artisan test --testsuite=Feature

# Frontend lint and production build
cd frontend && npm run lint
cd frontend && npm run build
```

CI runs both jobs on every push and pull request (`.github/workflows/ci.yml`).

## Troubleshooting

### Backend
- Clear cache: `php artisan cache:clear`
- Regenerate config: `php artisan config:cache`
- Run migrations: `php artisan migrate`

### Frontend
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf dist && npm run build`
- Check API URL in `.env`

## Performance Optimization

- Database query optimization with indexing
- Redis caching for frequently accessed data
- Lazy-loaded React routes (route-level code splitting)
- Code splitting in frontend
- Gzip compression enabled
- CDN ready for static assets

## Security Features

- Bcrypt password hashing
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

**Last Updated**: May 10, 2026
**Version**: 1.0.0