# Zadway API (Qarora)

Backend for the Zadway platform: the admin panel, the customer app and the driver (captain) app.
Built with **Node.js + Express**, **Prisma ORM** on **MySQL**, JWT auth and a WebSocket server for live updates.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database (Prisma)](#database-prisma)
- [npm scripts](#npm-scripts)
- [Project structure](#project-structure)
- [API conventions](#api-conventions)
- [Endpoints overview](#endpoints-overview)
- [Realtime (WebSocket)](#realtime-websocket)
- [File uploads](#file-uploads)
- [Testing & Postman](#testing--postman)

---

## Tech stack

| Area          | Library                                   |
| ------------- | ----------------------------------------- |
| HTTP server   | Express 4, helmet, cors, morgan           |
| Database      | MySQL 8 + Prisma 6 (multi-file schema)    |
| Auth          | JWT (access + refresh), bcryptjs          |
| Validation    | zod                                       |
| Realtime      | ws (WebSocket on `/ws`)                   |
| Docs          | swagger-jsdoc + swagger-ui (`/api/docs`)  |
| Reports       | exceljs (Excel), puppeteer (PDF)          |
| Push          | firebase-admin                            |
| Tests         | vitest + supertest                        |

## Getting started

**Requirements:** Node.js 18+, MySQL 8+.

```bash
# 1. Install dependencies
npm install

# 2. Create your .env (see the next section)

# 3. Create the database tables and the Prisma client
npm run prisma:push
npm run prisma:generate

# 4. (Optional) Seed demo data
npm run seed:all

# 5. Start the dev server (auto-restart with nodemon)
npm run dev
```

The server starts on `http://localhost:3000` (or `PORT`):

- API base URL: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`
- WebSocket: `ws://localhost:3000/ws?token=<JWT>`

For production use `npm start`.

## Environment variables

Create a `.env` file in the `api/` folder:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="mysql://user:password@localhost:3306/zadway"
DB_CONNECTION_LIMIT=5        # optional, Prisma pool size
DB_POOL_TIMEOUT=20           # optional, seconds

# JWT
JWT_SECRET=change_me
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=change_me_too
JWT_REFRESH_EXPIRE=30d

# CORS (comma separated; empty = allow all origins)
CORS_ORIGINS=http://localhost:5173
CORS_CREDENTIALS=false

# Optional tuning
AUTH_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
AUTH_RATE_LIMIT_MAX=50
UPLOAD_MAX_IMAGE_MB=5
UPLOAD_MAX_VIDEO_MB=50
PRODUCT_ORDER_MAX_KM=20            # radius for matching drivers to an order
PRODUCT_ORDER_MAX_CANDIDATES=10
```

> The variable is `CORS_ORIGINS` (plural). `CORS_ORIGIN` is ignored.

## Database (Prisma)

The schema is split into several files under `prisma/modules/`:

| File                  | Contents                                             |
| --------------------- | ---------------------------------------------------- |
| `_base.prisma`        | Generator and datasource                             |
| `users.prisma`        | Users, roles & permissions, wallets, reviews, addresses, bank cards, complaints |
| `driver.prisma`       | Documents, driver documents, vehicle details         |
| `produc.prisma`       | Categories, products, sizes, types, variants, coupons |
| `order.prisma`        | Guests, product orders, items, offers, payments, driver inventory, inventory logs, location updates |
| `booking.prisma`      | Booking invoices and location updates                |
| `ride.prisma`         | Ride bids, ratings and histories                     |
| `support.prisma`      | Support tickets, chat history, pages                 |
| `notification.prisma` | Notifications and push notifications                 |
| `admin.prisma`        | Admin login history/devices, admin settings          |
| `banner.prisma`       | Banners                                              |
| `seeting.prisma`      | SOS contacts, security audit logs                    |
| `withdraw.prisma`     | Withdraw requests                                    |

Common commands:

```bash
npm run prisma:generate   # regenerate the Prisma client after schema changes
npm run prisma:push       # sync the schema to the database (development)
npm run prisma:migrate    # create and apply a migration
npm run prisma:studio     # browse data in the browser
```

## npm scripts

| Script                    | Description                          |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Start with nodemon (development)     |
| `npm start`               | Start with node (production)         |
| `npm run prisma:*`        | Prisma commands (see above)          |
| `npm run prisma:seed`     | Run `prisma/seed.js`                 |
| `npm run seed:all`        | Run `prisma/seed-all.js` (full demo data) |
| `npm test`                | Run the vitest suite once            |
| `npm run test:watch`      | Run vitest in watch mode             |

## Project structure

```text
api/
├── prisma/
│   ├── modules/          # multi-file Prisma schema
│   ├── migrations/
│   └── seed*.js          # seed scripts
├── src/
│   ├── server.js         # HTTP + WebSocket bootstrap
│   ├── app.js            # Express app, middlewares, swagger
│   ├── config/           # env loading, Prisma client
│   ├── core/             # middlewares, CRUD helpers, utils, i18n
│   ├── i18n/             # API message translations (en / ar)
│   ├── modules/          # one folder per feature
│   ├── realtime/         # WebSocket server and event hub
│   ├── routes/index.js   # mounts every module under /api
│   └── services/         # shared services
├── uploads/              # uploaded media (served at /uploads)
├── postman/              # Postman collections and environments
├── scripts/              # code generators and smoke scripts
└── tests/                # vitest unit tests
```

Each feature in `src/modules/<name>/` follows the same layout:

```text
<name>.routes.js       # routes + auth / permission middlewares
<name>.controller.js   # request → response
<name>.service.js      # business logic and Prisma queries
<name>.validator.js    # zod schemas
```

## API conventions

**Authentication** - send the JWT in the header:

```http
Authorization: Bearer <token>
```

Admin routes are also checked against role permissions (e.g. `wallets.manage`).

**Language** - API messages are returned in English or Arabic. The language is picked from, in order: `?lang=ar|en`, the `x-lang` header, then `Accept-Language`.

**Response format**

```jsonc
// success
{ "success": true, "message": "Success", "data": { } }

// paginated list
{ "success": true, "message": "Success", "data": [ ], "pagination": { "page": 1, "limit": 20, "total": 120, "pages": 6 } }

// error
{ "success": false, "message": "Not found" }
```

**List query parameters** (all CRUD list endpoints):

| Param   | Example         | Notes                                 |
| ------- | --------------- | ------------------------------------- |
| `page`  | `1`             | default 1                             |
| `limit` | `20`            | default 20, capped per module         |
| `sort`  | `createdAt:desc`| `field:asc` or `field:desc`, default `id:desc` |
| `q`     | `ahmed`         | text search on the module's searchable fields |

Many modules also accept filters such as `userId`, `driverId`, `status`, etc.

## Endpoints overview

All routes are prefixed with `/api`. Full details are in Swagger at `/api/docs`.

### Public & auth

| Method | Path                    | Description                 |
| ------ | ----------------------- | --------------------------- |
| POST   | `/register`             | Public registration         |
| POST   | `/auth/login`           | Login (returns JWT)         |
| POST   | `/auth/register`        | Register customer           |
| POST   | `/auth/driver/register` | Register driver             |
| GET    | `/auth/me`              | Current user profile        |
| PATCH  | `/auth/me`              | Update profile              |
| POST   | `/auth/me/password`     | Change password             |
| POST   | `/auth/me/avatar`       | Upload avatar               |
| GET    | `/public/branding`      | App branding (logo)         |
| GET    | `/public/offers`        | Active coupons / offers     |

### Customer app - `/client`

| Method | Path                                    | Description              |
| ------ | --------------------------------------- | ------------------------ |
| GET    | `/client/catalog`                       | Categories and products  |
| GET    | `/client/products/:productId/variants`  | Product variants         |
| POST   | `/client/guests`                        | Create guest customer    |
| POST   | `/client/orders`                        | Place an order           |
| GET    | `/client/orders`                        | My orders                |
| GET    | `/client/orders/:id`                    | Order details            |

### Driver app - `/drivers/me`

| Area        | Endpoints                                                              |
| ----------- | ---------------------------------------------------------------------- |
| Onboarding  | `GET /onboarding`                                                      |
| Location    | `PATCH /location`                                                      |
| Orders      | `GET /product-orders`, `GET /product-orders/:orderId`, `POST /product-orders/:orderId/offers`, `POST /product-orders/:orderId/claim`, `PATCH /product-orders/:orderId/status` |
| Inventory   | `GET/POST /inventory`, `PATCH/DELETE /inventory/:id`                   |
| Catalog     | `GET/POST /categories`, `PATCH/DELETE /categories/:id`, `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `POST /products/:id/variants` |
| Finance     | `GET /wallet`, `GET/POST /withdrawals`, `GET /commissions`, `GET /reports` |
| Media       | `POST /media`                                                          |

### Admin panel

Admin-only helpers:

| Path                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `/admin/dashboard`     | Dashboard statistics                         |
| `/admin/reports`       | Reports by date range (JSON, PDF, Excel)     |
| `/admin/drivers`       | Driver approvals (onboarding review)         |
| `/admin/settings`      | Platform settings (commission, ...)          |
| `/admin/branding`      | Logo / branding                              |
| `/admin/meta`          | Lookup data for the admin UI                 |

Standard CRUD resources (`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`):

| Group          | Resources                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Users & access | `users`, `roles`, `permissions`, `role-permissions`, `user-roles`, `user-addresses`, `user-bank-cards`, `user-details` |
| Drivers        | `documents`, `driver-documents`, `driver-inventory-items`, `inventory-logs`                      |
| Shop           | `categories`, `products`, `product-types`, `sizes`, `product-variants`, `coupons`, `banners`     |
| Orders         | `product-orders`, `product-order-items`, `product-order-offers`, `product-order-location-updates`, `guest-customers`, `payments` |
| Bookings/rides | `booking-invoices`, `booking-location-updates`, `ride-request-bids`, `ride-request-ratings`, `ride-request-histories` |
| Finance        | `wallets`, `wallet-histories`, `withdraw-requests`                                               |
| Support        | `customer-supports`, `support-chathistories`, `complaints`, `reviews`, `pages`, `sos`            |
| Notifications  | `notifications`, `push-notifications`                                                            |
| Security       | `admin-login-history`, `admin-login-devices`, `security-audit-logs`                              |

Some resources have extra actions, for example:

- `POST /wallets/user/:userId/credit` and `/debit` - adjust a wallet balance
- `POST /withdraw-requests/:id/approve` and `/reject`
- `POST /customer-supports/:id/messages` - admin reply on a ticket
- `GET /customer-supports/stats`, `GET /admin-login-history/stats`

## Realtime (WebSocket)

Connect with a valid JWT:

```text
ws://localhost:3000/ws?token=<JWT>
```

Used for live order / driver location updates in the admin tracking page and the apps. Connections without a token are closed with code `1008`.

## File uploads

| Method | Path                  | Description     |
| ------ | --------------------- | --------------- |
| POST   | `/api/uploads/image`  | Upload an image |
| POST   | `/api/uploads/video`  | Upload a video  |

Files are stored in `uploads/` and served statically at `/uploads/...`.
Size limits come from `UPLOAD_MAX_IMAGE_MB` and `UPLOAD_MAX_VIDEO_MB`.

## Testing & Postman

```bash
npm test             # run all unit tests
npm run test:watch   # watch mode
```

Postman collections and environments are in `postman/`:

- `qarora.postman_collection.json` + `Qarora.Local.postman_environment.json` - admin / full API
- `zadway-mobile.postman_collection.json` + `zadway-mobile.dev_environment.json` / `zadway-mobile.prod_environment.json` - mobile apps
