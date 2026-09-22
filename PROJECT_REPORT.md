# تقرير شامل عن مشروع Qarora / Tovo Backend API

> **تاريخ التقرير:** 22 يونيو 2026  
> **المسار:** `d:\mohamed_abdo\qarora\backend\api`  
> **اسم الحزمة:** `tovo-backend` v1.0.0  
> **الوصف:** Backend API لمنصة توصيل منتجات (مياه وغيرها) مع إدارة سائقين وركاب ولوحة تحكم إدارية — مبني على Node.js + Express + Prisma + MySQL.

---

## جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [التقنيات والاعتماديات](#2-التقنيات-والاعتماديات)
3. [هيكل المشروع](#3-هيكل-المشروع)
4. [الإعداد والتشغيل](#4-الإعداد-والتشغيل)
5. [البنية المعمارية](#5-البنية-المعمارية)
6. [المصادقة والصلاحيات (RBAC)](#6-المصادقة-والصلاحيات-rbac)
7. [عقد الاستجابة (Response Contract)](#7-عقد-الاستجابة-response-contract)
8. [جميع الـ API Endpoints](#8-جميع-ال-api-endpoints)
9. [WebSocket (الوقت الفعلي)](#9-websocket-الوقت-الفعلي)
10. [مخطط Prisma الكامل](#10-مخطط-prisma-الكامل)
11. [تدفقات العمل الرئيسية](#11-تدفقات-العمل-الرئيسية)
12. [البذور (Seeds) والاختبارات](#12-البذور-seeds-والاختبارات)
13. [السكربتات والأدوات](#13-السكربتات-والأدوات)
14. [ملاحظات مهمة](#14-ملاحظات-مهمة)

---

## 1. نظرة عامة

المشروع هو **REST API** حديث لإدارة:

| المجال | الوصف |
|--------|--------|
| **المستخدمون** | Admin, Staff, Driver, Rider |
| **الكتالوج** | فئات، منتجات، أنواع، مقاسات، متغيرات (Variants) |
| **الطلبات** | `ProductOrder` — طلبات توصيل منتجات مع مطابقة سائقين ومخزون |
| **المحفظة** | Wallets + WalletHistory + Payments + WithdrawRequests |
| **الرحلات (Legacy)** | RideRequestBids, Ratings, Histories (جداول موجودة، CRUD إداري) |
| **الدعم** | CustomerSupport + SupportChathistory |
| **الإدارة** | Dashboard, Reports (PDF/Excel), Branding, Meta |
| **الأمان** | SecurityAuditLog, JWT, Rate limiting على `/api/auth` |

**Base URL للـ API:** `http://localhost:{PORT}/api` (الافتراضي PORT=3000 في `server.js`، README يذكر 5000 — راجع `.env`)

**Swagger Docs:** `GET /api/docs`

**ملفات ثابتة للرفع:** `GET /uploads/*`

---

## 2. التقنيات والاعتماديات

| التقنية | الاستخدام |
|---------|-----------|
| **Node.js (ES Modules)** | Runtime |
| **Express 4** | HTTP Server |
| **Prisma 6** | ORM — schema متعدد الملفات في `prisma/modules` |
| **MySQL** | قاعدة البيانات |
| **JWT** (`jsonwebtoken`) | مصادقة |
| **bcryptjs** | تشفير كلمات المرور |
| **Zod + express-validator** | التحقق من المدخلات |
| **Multer** | رفع الملفات |
| **Helmet + CORS + Morgan** | أمان وتسجيل |
| **express-rate-limit** | تحديد معدل طلبات Auth |
| **ws** | WebSocket على `/ws` |
| **socket.io** | موجود كاعتمادية (للتكاملات المحتملة) |
| **Puppeteer + ExcelJS** | تقارير PDF و Excel |
| **Firebase Admin** | إشعارات Push (جاهز) |
| **MQTT** | تكامل محتمل |
| **Vitest + Supertest** | اختبارات |

---

## 3. هيكل المشروع

```
api/
├── prisma/
│   ├── modules/           # مخطط Prisma (multi-file)
│   │   ├── _base.prisma
│   │   ├── users.prisma
│   │   ├── admin.prisma
│   │   ├── driver.prisma
│   │   ├── order.prisma
│   │   ├── produc.prisma
│   │   ├── ride.prisma
│   │   ├── booking.prisma
│   │   ├── notification.prisma
│   │   ├── support.prisma
│   │   ├── banner.prisma
│   │   ├── withdraw.prisma
│   │   └── seeting.prisma
│   ├── migrations/
│   └── seed.js            # بذرة رئيسية شاملة
├── src/
│   ├── server.js          # نقطة الدخول + WebSocket
│   ├── app.js             # Express middleware + routes
│   ├── config/            # env, prisma
│   ├── routes/index.js    # تجميع كل المسارات
│   ├── core/
│   │   ├── middlewares/   # auth, authorize, validate, i18n, securityAudit
│   │   ├── crud/          # genericCrudService
│   │   ├── upload/        # مسارات الوسائط
│   │   ├── utils/         # pagination, jwt, i18n fields
│   │   └── i18n/          # ar + en
│   ├── modules/           # ~50 وحدة (controller/service/routes/validator)
│   ├── services/          # PDF, Excel, product order matching
│   └── realtime/          # wsServer, wsHub, wsEvents
├── tests/
├── scripts/
├── uploads/
└── docs/                  # وثائق هندسية إضافية
```

**نمط الوحدة (Module Pattern):** كل مورد يتبع:

- `*.routes.js` — المسارات
- `*.controller.js` — معالجة HTTP
- `*.service.js` — منطق الأعمال + Prisma
- `*.validator.js` — Zod schemas

معظم الموارد تستخدم `createCrudService` للعمليات CRUD القياسية.

---

## 4. الإعداد والتشغيل

### المتطلبات

- Node.js ≥ 18
- MySQL ≥ 8

### أوامر npm

| الأمر | الوظيفة |
|-------|---------|
| `npm run dev` | تشغيل مع nodemon |
| `npm start` | تشغيل إنتاج |
| `npm run prisma:generate` | توليد Prisma Client |
| `npm run prisma:migrate` | migrations |
| `npm run prisma:push` | دفع Schema (تطوير) |
| `npm run prisma:studio` | واجهة Prisma |
| `npm run prisma:seed` / `seed:all` | بذرة البيانات |
| `npm test` | Vitest |

### متغيرات البيئة (`.env`)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
JWT_SECRET=...
JWT_EXPIRE=7d
CORS_ORIGINS=...
CORS_CREDENTIALS=false
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=50
UPLOAD_MAX_IMAGE_MB=12
UPLOAD_MAX_VIDEO_MB=200
GOOGLE_MAPS_API_KEY=...   # اختياري
```

---

## 5. البنية المعمارية

### Middleware Pipeline (`app.js`)

1. `helmet()` — أمان HTTP headers
2. `cors()` — مصادر مسموحة من `CORS_ORIGINS`
3. `morgan()` — تسجيل الطلبات
4. `express.json` (حد 5MB)
5. `requestId` — معرّف فريد لكل طلب
6. `i18nMiddleware` — دعم ar/en
7. `express.static` على `/uploads`
8. Rate limit على `/api/auth`
9. `apiRoutes` على `/api`
10. `securityAudit()` — تسجيل أحداث الأمان
11. Swagger على `/api/docs`
12. `notFound` + `errorHandler`

### أنواع المستخدمين (`userType`)

| النوع | الوصف |
|-------|--------|
| `admin` | مدير كامل |
| `staff` | موظفو لوحة التحكم (صلاحيات عبر Roles) |
| `driver` | سائق توصيل |
| `rider` | راكب/عميل مسجّل |

---

## 6. المصادقة والصلاحيات (RBAC)

### JWT

- يُرسل في Header: `Authorization: Bearer <token>`
- يُستخرج عند Login ويُرفق `permissionNames` للـ staff

### مستويات الحماية على المسارات

| الرمز | المعنى |
|-------|--------|
| **عام** | بدون مصادقة |
| **Auth** | `authenticate` — JWT مطلوب |
| **OptionalAuth** | JWT اختياري |
| **View** | `requireResourceAccess("x.manage")` — يقبل `x.view` أو `x.manage` |
| **Manage** | `requirePermission(["x.manage"])` — كتابة/حذف |
| **Driver** | `requireDriver` — سائق فقط |
| **Rider** | `requireRider` — راكب فقط |

### نظام الصلاحيات

- كل مورد إداري له: `{resource}.view` و `{resource}.manage`
- Wildcard `*` يمنح كل الصلاحيات
- `admin.dashboard.view` — لوحة التحكم والتقارير
- `admin.tracking.view` — تتبع (صفحة)
- `admin.branding.manage` — شعار التطبيق
- `media.upload.manage` — رفع صور/فيديو

### الأدوار في Seed

| الدور | الصلاحيات |
|-------|-----------|
| **admin** | كل الصلاحيات |
| **manager** | إدارة عمليات + كتالوج + مستخدمين + RBAC جزئي |
| **editor** | قراءة فقط (كل `.view`) |
| **driver** | دور تطبيق السائق |
| **rider** | دور التطبيق للراكب |

### حسابات Seed (من `prisma/seed.js`)

| البريد | كلمة المرور | النوع |
|--------|-------------|-------|
| `admin@admin.com` | `admin123` | admin |
| `manager@qarora.local` | `password` | staff |
| `editor@qarora.local` | `password` | staff |
| `driver@qarora.com` | `password` | driver |
| `rider@qarora.com` | `password` | rider |

---

## 7. عقد الاستجابة (Response Contract)

### نجاح

```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

### نجاح مع ترقيم

```json
{
  "success": true,
  "message": "...",
  "data": [ ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

### خطأ

```json
{
  "success": false,
  "message": "..."
}
```

---

## 8. جميع الـ API Endpoints

> **ملاحظة:** كل المسارات أدناه تبدأ بـ `/api`  
> **نمط CRUD القياسي** (يُكرر لمعظم الموارد الإدارية):

| Method | Path | Auth | الوصف |
|--------|------|------|-------|
| GET | `/resource` | View | قائمة مع pagination وفلترة |
| GET | `/resource/:id` | View | تفاصيل سجل |
| POST | `/resource` | Manage | إنشاء |
| PATCH | `/resource/:id` | Manage | تحديث جزئي |
| DELETE | `/resource/:id` | Manage | حذف |

---

### 8.1 المصادقة — `/auth`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| POST | `/api/auth/login` | عام | تسجيل دخول — يرجع JWT + بيانات المستخدم |
| POST | `/api/auth/register` | عام | تسجيل راكب/سائق |
| GET | `/api/auth/me` | Auth | الملف الشخصي للمستخدم الحالي |
| PATCH | `/api/auth/me` | Auth | تحديث الملف الشخصي |
| POST | `/api/auth/me/avatar` | Auth | رفع صورة شخصية (multipart `file`) |

### 8.2 تسجيل عام — جذر API

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| POST | `/api/register` | عام | تسجيل عام (`publicRegister`) |

### 8.3 Branding عام

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/public/branding` | عام | شعار التطبيق للواجهة العامة |

---

### 8.4 واجهة العميل (Client) — `/client`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/client/catalog` | عام | كتالوج: فئات + منتجات نشطة + variants |
| GET | `/api/client/products/:productId/variants` | عام | متغيرات منتج مع صور |
| POST | `/api/client/guests` | عام | إنشاء/إيجاد ضيف بالاسم أو الهاتف |
| POST | `/api/client/orders` | OptionalAuth | إنشاء طلب منتج — يربط راكب أو ضيف |
| GET | `/api/client/orders` | Auth + Rider | قائمة طلبات الراكب |
| GET | `/api/client/orders/:id` | OptionalAuth | تفاصيل طلب — يقبل `X-Order-Access-Token` للضيوف |

---

### 8.5 السائق (تطبيق السائق) — `/drivers`

> كل المسارات تتطلب: **Auth + Driver**

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/drivers/me/inventory` | مخزون السائق |
| POST | `/api/drivers/me/inventory` | إضافة صنف للمخزون |
| PATCH | `/api/drivers/me/inventory/:id` | تحديث كمية/سعر |
| DELETE | `/api/drivers/me/inventory/:id` | حذف صنف |
| PATCH | `/api/drivers/me/location` | تحديث GPS (lat, lng, heading) |
| GET | `/api/drivers/me/product-orders` | طلبات متاحة/مخصصة للسائق |
| GET | `/api/drivers/me/product-orders/:orderId` | تفاصيل طلب |
| POST | `/api/drivers/me/product-orders/:orderId/offers` | تقديم/تحديث عرض سعر |
| POST | `/api/drivers/me/product-orders/:orderId/claim` | المطالبة بالطلب |
| PATCH | `/api/drivers/me/product-orders/:orderId/status` | تقدم حالة التوصيل (`PICKED_UP` / `ON_THE_WAY` / `DELIVERED`) |

---

### 8.6 لوحة الإدارة — Admin

#### Dashboard — `/admin/dashboard`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/admin/dashboard/stats` | `admin.dashboard.view` | إحصائيات: مستخدمين، طلبات، إيرادات، رسوم بيانية |

#### Meta — `/admin/meta`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/admin/meta` | `admin.dashboard.view` | خيارات الحالات (order statuses, complaints, withdraw...) |

#### Reports — `/admin/reports`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/admin/reports/range?from=&to=` | `admin.dashboard.view` | تقرير JSON لنطاق تاريخ |
| GET | `/api/admin/reports/range.pdf?from=&to=&lang=` | `admin.dashboard.view` | تصدير PDF |
| GET | `/api/admin/reports/range.xlsx?from=&to=` | `admin.dashboard.view` | تصدير Excel |

#### Branding — `/admin/branding`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| PUT | `/api/admin/branding` | `admin.branding.manage` | تحديث شعار الإدارة |

---

### 8.7 الرفع — `/uploads`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| POST | `/api/uploads/image` | `media.upload.manage` | رفع صورة (multipart `file`) |
| POST | `/api/uploads/video` | `media.upload.manage` | رفع فيديو |

---

### 8.8 المستخدمون — `/users`  
**صلاحية:** `users.manage` / `users.view`

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/users` | View | قائمة |
| GET | `/api/users/:id` | View | تفاصيل |
| POST | `/api/users/register` | عام | تسجيل مستخدم |
| POST | `/api/users` | Manage | إنشاء (إداري) |
| PATCH | `/api/users/:id` | Manage | تحديث |
| DELETE | `/api/users/:id` | Manage | حذف |

---

### 8.9 RBAC

#### Permissions — `/permissions` (`permissions.manage`)

| GET `/` | GET `/:id` | POST `/` | PATCH `/:id` | DELETE `/:id` |

#### Roles — `/roles` (`roles.manage`)

| GET `/` | GET `/:id` | POST `/` | PATCH `/:id` | DELETE `/:id` |

#### Role Permissions — `/role-permissions` (`role_permissions.manage`)

| GET `/` | GET `/:id` | POST `/` | PATCH `/:id` | DELETE `/:id` |

#### User Roles — `/user-roles` (`user_roles.manage`)

| GET `/` | GET `/:id` | POST `/` | POST `/:id` | DELETE `/:id` |

---

### 8.10 المحفظة — `/wallets` (`wallets.manage`)

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/wallets` | View | قائمة |
| GET | `/api/wallets/:id` | View | تفاصيل |
| POST | `/api/wallets` | Manage | إنشاء |
| PATCH | `/api/wallets/:id` | Manage | تحديث |
| DELETE | `/api/wallets/:id` | Manage | حذف |
| POST | `/api/wallets/user/:userId/credit` | Manage | إضافة رصيد |
| POST | `/api/wallets/user/:userId/debit` | Manage | خصم رصيد |

### Wallet Histories — `/wallet-histories` (`wallet_histories.manage`)

CRUD قياسي كامل.

---

### 8.11 الكتالوج والمنتجات

#### Categories — `/categories` (`categories.manage`)

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/categories/all` | عام | قائمة عامة للتطبيق |
| GET/PATCH/POST/DELETE | CRUD قياسي | View/Manage | إدارة |

#### Products — `/products` (`products.manage`)

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/products/all` | عام | منتجات للتطبيق |
| GET | `/api/products/category/:categoryId` | عام | منتجات حسب الفئة |
| GET | `/api/products/mobile/:id` | عام | تفاصيل منتج للموبايل |
| CRUD | قياسي | View/Manage | إدارة |

#### Product Types — `/product-types` (`product_types.manage`) — CRUD

#### Sizes — `/sizes` (`sizes.manage`) — CRUD

#### Product Variants — `/product-variants` (`product_variants.manage`) — CRUD

#### Coupons — `/coupons` (`coupons.manage`) — CRUD

#### Banners — `/banners` (`banners.manage`)

| GET `/all` | عام — بانرات نشطة |
| CRUD | إداري |

---

### 8.12 طلبات المنتجات (Product Orders)

#### Product Orders — `/product-orders` (`orders.manage`)

| Method | Endpoint | Auth | الوصف |
|--------|----------|------|-------|
| GET | `/api/product-orders` | View | قائمة — فلتر: guestId, driverId, riderUserId, status |
| GET | `/api/product-orders/:id` | View | تفاصيل |
| GET | `/api/product-orders/:id/invoice` | View | تحميل فاتورة PDF |
| POST | `/api/product-orders` | Manage | إنشاء |
| PATCH | `/api/product-orders/:id` | Manage | تحديث |
| PATCH | `/api/product-orders/:id/status` | Manage | تغيير حالة الطلب |
| PATCH | `/api/product-orders/:id/assign-driver` | Manage | تعيين سائق |
| PATCH | `/api/product-orders/:id/offers/:offerId/accept` | Manage | قبول عرض سائق |
| DELETE | `/api/product-orders/:id` | Manage | حذف |

**حالات الطلب (`ProductOrderStatus`):**  
`NEW` → `PENDING` → `ACCEPTED` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`  
أو: `REJECTED` / `CANCELLED`

#### Product Order Items — `/product-order-items` (`product_order_items.manage`) — CRUD

#### Product Order Offers — `/product-order-offers` (`product_order_offers.manage`) — CRUD

#### Product Order Location Updates — `/product-order-location-updates` (`product_order_location_updates.manage`) — CRUD

#### Guest Customers — `/guest-customers` (`guest_customers.manage`)

| POST `/register` | عام — تسجيل ضيف |
| CRUD | إداري |

#### Driver Inventory Items — `/driver-inventory-items` (`driver_inventory_items.manage`) — CRUD

#### Inventory Logs — `/inventory-logs` (`inventory_logs.manage`) — CRUD

#### Payments — `/payments` (`payments.manage`) — CRUD

---

### 8.13 الرحلات (Ride — Legacy CRUD)

#### Ride Request Bids — `/ride-request-bids` (`ride_request_bids.manage`)

| POST `/:id/accept` | Manage — قبول عرض |
| CRUD | قياسي |

#### Ride Request Ratings — `/ride-request-ratings` (`ride_request_ratings.manage`) — CRUD

#### Ride Request Histories — `/ride-request-histories` (`ride_request_histories.manage`) — CRUD

---

### 8.14 السائقون والوثائق

#### Documents — `/documents` (`documents.manage`) — CRUD — أنواع الوثائق المطلوبة

#### Driver Documents — `/driver-documents` (`driver_documents.manage`) — CRUD — وثائق السائق المرفوعة

#### User Details — `/user-details` (`user_details.manage`) — CRUD — بيانات السيارة والعناوين

---

### 8.15 المستخدم — عناوين وبطاقات

#### User Addresses — `/user-addresses` (`user_addresses.manage`) — CRUD

#### User Bank Cards — `/user-bank-cards` (`user_bank_cards.manage`) — CRUD

#### Reviews — `/reviews` (`reviews.manage`) — CRUD

#### Complaints — `/complaints` (`complaints.manage`) — CRUD

---

### 8.16 الحجوزات (Booking)

#### Booking Invoices — `/booking-invoices` (`booking_invoices.manage`) — CRUD

#### Booking Location Updates — `/booking-location-updates` (`booking_location_updates.manage`) — CRUD

---

### 8.17 السحب والدعم

#### Withdraw Requests — `/withdraw-requests` (`withdraw_requests.manage`)

| POST `/:id/approve` | Manage |
| POST `/:id/reject` | Manage |
| CRUD | قياسي |

**حالات السحب:** `0` pending, `1` approved, `2` rejected

#### Customer Supports — `/customer-supports` (`customer_supports.manage`)

| POST `/me` | Auth — فتح تذكرة |
| GET `/me` | Auth — تذاكري |
| POST `/me/:id/messages` | Auth — إرسال رسالة |
| POST `/:id/messages` | Manage — رد الإدارة |
| CRUD | إداري |

#### Support Chathistories — `/support-chathistories` (`support_chathistories.manage`) — CRUD

#### Pages — `/pages` (`pages.manage`) — CRUD — صفحات CMS

---

### 8.18 الإشعارات والأمان

#### Notifications — `/notifications` (`notifications.manage`)

| POST `/read-all` | Auth — تعليم الكل مقروء |
| POST `/:id/read` | Auth — تعليم واحد |
| CRUD | إداري |

#### Push Notifications — `/push-notifications` (`push_notifications.manage`) — CRUD

#### SOS — `/sos` (`sos.manage`) — CRUD — جهات اتصال طوارئ

#### Security Audit Logs — `/security-audit-logs` (`security_audit_logs.manage`) — CRUD

---

### 8.19 تسجيل دخول الإدارة

#### Admin Login Devices — `/admin-login-devices` (`admin_login_devices.manage`) — CRUD

#### Admin Login History — `/admin-login-history` (`admin_login_history.manage`) — CRUD

---

### 8.20 ملخص عدد الـ Endpoints

| الفئة | العدد التقريبي |
|-------|----------------|
| CRUD كامل (×40 مورد) | ~200 endpoint |
| مسارات خاصة (client, drivers, orders, wallets...) | ~35 endpoint |
| Admin + Auth + Uploads | ~15 endpoint |
| **الإجمالي** | **~250+ endpoint** |

---

## 9. WebSocket (الوقت الفعلي)

**المسار:** `ws://host/ws?token=<JWT>`

### أحداث الاتصال

| Event | الاتجاه | الوصف |
|-------|---------|-------|
| `connected` | Server → Client | تأكيد الاتصال |
| `ping` / `pong` | Client ↔ Server | keep-alive |

### أحداث الأعمال

| Event | المستلمون | المحفّز |
|-------|-----------|---------|
| `new_product_order` | سائقون مؤهلون | إنشاء طلب جديد |
| `order_claimed` | السائق + Admins | `POST /drivers/me/product-orders/:id/claim` |
| `order_status_changed` | سائق + راكب + Admins | تغيير حالة الطلب |
| `driver_location_updated` | Broadcast | `PATCH /drivers/me/location` |
| `product_order_location_update.created` | Broadcast | إنشاء تحديث موقع طلب |
| `product_order_location_update.updated` | Broadcast | تحديث موقع طلب |
| `booking_location_update.created` | Broadcast | تحديث موقع حجز |
| `booking_location_update.updated` | Broadcast | تحديث موقع حجز |

---

## 10. مخطط Prisma الكامل

> المصدر: `prisma/modules/*.prisma`  
> قاعدة البيانات: **MySQL**  
> Feature: `prismaSchemaFolder`

---

### 10.1 `_base.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

---

### 10.2 `users.prisma`

#### Enums

لا يوجد — الحالات نصية (`status`, `userType`)

#### Models

**User** → `users`

| الحقل | النوع | ملاحظات |
|-------|-------|---------|
| id | Int @id | |
| name | String? | `first_name` |
| email | String? @unique | |
| password | String? | |
| countryCode | String? | افتراضي +1 |
| phone | Int? @unique | |
| userType | String? | admin/staff/driver/rider |
| uid, loginType, displayName | String? | |
| status | String | افتراضي pending |
| isOnline, isAvailable, isVerified | Boolean | |
| latitude, longitude | String? | |
| currentHeading | Float? | |
| lastLocationUpdateAt, lastActivedAt | DateTime? | |
| referralCode | String? @unique | |
| otp, otpExpiresAt | | تحقق |
| appVersion, avatar | | |
| driverRejectionCount, rejectionReason, lastRejectionAt | | رفض السائق |
| pushNotificationsEnabled | Boolean | |
| createdAt, updatedAt | DateTime | |

**علاقات User:** Wallet, WalletHistory, UserRole, ProductOrders (driver/rider), DriverInventoryItem, ProductOrderLocationUpdate, ProductOrderOffer, InventoryLog, Payment, DriverDocument, Complaint, RideRequestBid, RideRequestRating, WithdrawRequest, UserDetail, CustomerSupport, AdminLoginDevice, UserAddress, UserBankCard

---

**Permission** → `permissions`  
`id, name, guardName (web), parentId` — هيكل شجري للصلاحيات

**Role** → `roles`  
`id, name, guardName`

**RolePermission** → `role_permissions`  
`roleId, permissionId` — unique [roleId, permissionId]

**UserRole** → `user_roles`  
`userId, roleId` — unique [userId, roleId]

---

**Wallet** → `wallets`  
`userId @unique, balance (Double), currency (SAR)`

**WalletHistory** → `wallet_histories`  
`walletId, userId, ProductOrderId?, type, amount, balance, description, transactionType`

**Review** → `reviews`  
`driverId, riderId, rideRequestId, driverRating, riderRating, driverReview, riderReview` + i18n JSON

**UserAddress** → `user_addresses`  
`userId, title, address, lat/lng, isDefault` + i18n

**UserBankCard** → `user_bank_cards`  
`userId, cardHolderName, lastFourDigits, brand, expiryMonth/Year, isDefault`

**Complaint** → `complaints`  
`driverId, riderId, message, status (pending)` + i18n

---

### 10.3 `admin.prisma`

**AdminLoginDevice** → `admin_login_devices`  
`userId, ipAddress, userAgent, loginAt, logoutAt, isActive, sessionId`

**AdminLoginHistory** → `admin_login_history`  
`userId?, ip, city, region, country, browser, device, isMobile/Desktop/Tablet...`

**AdminSetting** → `admin_settings`  
`key @unique, value` — إعدادات مثل الشعار

---

### 10.4 `driver.prisma`

**Document** → `documents`  
`name, nameAr, nameI18n, type, status, isRequired, hasExpiryDate`

**DriverDocument** → `driver_documents`  
`driverId, documentId, isVerified, documentImage, expireDate`

**UserDetail** → `user_details`  
`userId @unique, carModel, carColor, carPlateNumber, carProductionYear, carImage, work/home addresses + coordinates`

---

### 10.5 `order.prisma`

#### Enums

```prisma
enum ProductOrderStatus {
  NEW | PENDING | ACCEPTED | PICKED_UP | ON_THE_WAY | REJECTED | DELIVERED | CANCELLED
}

enum ProductPaymentMethod {
  CASH
}

enum ProductOfferStatus {
  PENDING | ACCEPTED | REJECTED
}

enum OrderStatus {
  NEW | OFFERED | ACCEPTED | PICKED_UP | DELIVERING | DELIVERED | CANCELLED
}
```

#### Models

**GuestCustomer** → `guest_customers`  
`name?, phone?`

**ProductOrder** → `Product_orders`  
| الحقل | الوصف |
|-------|--------|
| guestId | ضيف |
| driverId?, riderUserId? | سائق وراكب |
| accessToken? @unique | وصول الضيف للطلب |
| status | ProductOrderStatus |
| paymentMethod | CASH |
| dropoffLat/Lng | موقع التسليم |
| dropoffNotes + i18n | |
| subtotal, commissionPct, commissionAmt, total, currency | مالي |
| assignedAt, deliveredAt, cancelledAt | تواريخ |

**ProductOrderItem** → `Product_order_items`  
`orderId, variantId, quantity, unitPrice, lineTotal`

**DriverInventoryItem** → `driver_inventory_items`  
`driverId, variantId` unique — `quantityOnHand, price, currency`

**ProductOrderOffer** → `Product_order_offers`  
`orderId, driverId` unique — `offeredPrice, status`

**Payment** → `payments`  
`ProductOrderId, userId, driverId, amount, paymentType, paymentStatus`

**InventoryLog** → `inventory_logs`  
`driverId, variantId, change, reason` + i18n

**ProductOrderLocationUpdate** → `Product_order_location_updates`  
`orderId, driverId, lat, lng, heading?, speed?`

---

### 10.6 `produc.prisma`

**Category** — `id, name, nameI18n, description, descriptionI18n, image_url`

**Product** — `id, name, nameI18n, description, categoryId, imageUrl, images (JSON), isActive`

**ProductType** — `id, name, nameAr, nameI18n`

**Size** — `id, name, nameAr, nameI18n`

**ProductVariant** — `productId, sizeId, typeId` unique triple  
`price (Decimal), stock, sku, imageUrl, images, currency (IQD افتراضي)`

**Coupon** → `coupons`  
`code, title, couponType, discountType, discount, startDate, endDate, minimumAmount, maximumDiscount, status, regionIds, serviceIds...`

```prisma
enum DiscountType {
  PERCENTAGE
  FIXED
}
```

---

### 10.7 `ride.prisma`

**RideRequestBid** → `ride_request_bids`  
`rideRequestId, driverId, bidAmount, isBidAccept, notes` + i18n

**RideRequestRating** → `ride_request_ratings`  
`rideRequestId, riderId, driverId, rating, comment, ratingBy` + i18n

**RideRequestHistory** → `ride_request_histories`  
`rideRequestId, historyType` + i18n, `datetime`

> **ملاحظة:** لا يوجد model `RideRequest` في Schema الحالي — الجداول مرتبطة بـ `rideRequestId` كمرجع خارجي.

---

### 10.8 `booking.prisma`

**BookingInvoice** → `booking_invoices`  
`bookingId @unique, subtotal, tax, discount, total, issuedAt, paidAt`

**BookingLocationUpdate** → `booking_location_updates`  
`bookingId, lat, lng, createdAt`

---

### 10.9 `notification.prisma`

**Notification** → `notifications`  
`type, notifiableType, notifiableId, data (JSON), readAt, isRead`

**PushNotification** → `push_notifications`  
`title, message` + i18n, `forRider, forDriver`

---

### 10.10 `support.prisma`

**CustomerSupport** → `customer_supports`  
`message, supportType, userId, status, resolutionDetail` + i18n

**SupportChathistory** → `support_chathistories`  
`supportId, message, senderType` + i18n

**Pages** → `pages`  
`title, titleAr, description, slug @unique, status`

---

### 10.11 `banner.prisma`

**Banner** → `banners`  
`title, description, image, video, productId?, isActive`

---

### 10.12 `withdraw.prisma`

**WithdrawRequest** → `withdraw_requests`  
`userId, amount, currency (USD), status (Int: 0/1/2)`

---

### 10.13 `seeting.prisma`

**Sos** → `sos`  
`userId, name, nameAr, contactNumber, status`

**SecurityAuditLog** → `security_audit_logs`  
`category, userId?, userType?, ip, method, route, requestId, statusCode, metadata (JSON)`

---

### 10.14 مخطط العلاقات (ملخص)

```mermaid
erDiagram
    User ||--o| Wallet : has
    User ||--o{ UserRole : has
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : has
    User ||--o{ DriverInventoryItem : stocks
    ProductVariant ||--o{ DriverInventoryItem : variant
    Product ||--o{ ProductVariant : has
    Category ||--o{ Product : contains
    GuestCustomer ||--o{ ProductOrder : places
    User ||--o{ ProductOrder : drives
    User ||--o{ ProductOrder : rides
    ProductOrder ||--o{ ProductOrderItem : contains
    ProductOrder ||--o{ ProductOrderOffer : offers
    ProductOrder ||--o{ Payment : pays
    User ||--o{ CustomerSupport : opens
    CustomerSupport ||--o{ SupportChathistory : messages
```

---

### 10.15 قائمة كل الجداول (40 جدول)

| # | Model | جدول MySQL |
|---|-------|------------|
| 1 | User | users |
| 2 | Permission | permissions |
| 3 | Role | roles |
| 4 | RolePermission | role_permissions |
| 5 | UserRole | user_roles |
| 6 | Wallet | wallets |
| 7 | WalletHistory | wallet_histories |
| 8 | Review | reviews |
| 9 | UserAddress | user_addresses |
| 10 | UserBankCard | user_bank_cards |
| 11 | Complaint | complaints |
| 12 | AdminLoginDevice | admin_login_devices |
| 13 | AdminLoginHistory | admin_login_history |
| 14 | AdminSetting | admin_settings |
| 15 | Document | documents |
| 16 | DriverDocument | driver_documents |
| 17 | UserDetail | user_details |
| 18 | GuestCustomer | guest_customers |
| 19 | ProductOrder | Product_orders |
| 20 | ProductOrderItem | Product_order_items |
| 21 | DriverInventoryItem | driver_inventory_items |
| 22 | ProductOrderOffer | Product_order_offers |
| 23 | Payment | payments |
| 24 | InventoryLog | inventory_logs |
| 25 | ProductOrderLocationUpdate | Product_order_location_updates |
| 26 | Category | Category |
| 27 | Product | Product |
| 28 | ProductType | ProductType |
| 29 | Size | Size |
| 30 | ProductVariant | ProductVariant |
| 31 | Coupon | coupons |
| 32 | RideRequestBid | ride_request_bids |
| 33 | RideRequestRating | ride_request_ratings |
| 34 | RideRequestHistory | ride_request_histories |
| 35 | BookingInvoice | booking_invoices |
| 36 | BookingLocationUpdate | booking_location_updates |
| 37 | Notification | notifications |
| 38 | PushNotification | push_notifications |
| 39 | CustomerSupport | customer_supports |
| 40 | SupportChathistory | support_chathistories |
| 41 | Pages | pages |
| 42 | Banner | banners |
| 43 | WithdrawRequest | withdraw_requests |
| 44 | Sos | sos |
| 45 | SecurityAuditLog | security_audit_logs |

---

## 11. تدفقات العمل الرئيسية

### 11.1 طلب منتج (عميل → سائق)

```
1. GET /client/catalog                    → اختيار منتج/variant
2. POST /client/guests (أو تسجيل راكب)   → guestId
3. POST /client/orders                    → إنشاء ProductOrder (status: NEW)
   └─→ WS: new_product_order → سائقون مؤهلون (مخزون + قرب)
4. السائق: POST /drivers/.../offers       → عرض سعر (اختياري)
5. السائق: POST /drivers/.../claim        → قبول الطلب
   └─→ WS: order_claimed + order_status_changed
6. Admin أو السائق: PATCH status          → PICKED_UP → ON_THE_WAY → DELIVERED
7. GET /client/orders/:id                 → تتبع (token أو JWT)
```

### 11.2 مطابقة السائق (`productOrderMatching.js`)

- يتحقق من: مخزون السائق، كمية كافية، منتج نشط، مسافة/أهلية
- `assertEligibleDriversExist` عند إنشاء الطلب
- `findEligibleDriversSorted` للترتيب

### 11.3 انتقالات حالة الطلب

| من | إلى المسموح |
|----|-------------|
| NEW | PENDING, ACCEPTED, REJECTED, CANCELLED |
| PENDING | NEW, ACCEPTED, REJECTED, CANCELLED |
| ACCEPTED | PICKED_UP, ON_THE_WAY, DELIVERED, CANCELLED |
| PICKED_UP | ON_THE_WAY, DELIVERED, CANCELLED |
| ON_THE_WAY | DELIVERED, CANCELLED |
| DELIVERED / CANCELLED / REJECTED | نهائية |

---

## 12. البذور (Seeds) والاختبارات

### Seeds

| الأمر | الملف | المحتوى |
|-------|-------|---------|
| `npm run prisma:seed` | `prisma/seed.js` | مستخدمون، أدوار، صلاحيات، كتالوج مياه، سائقون بمخزون، طلبات تجريبية |
| `seed:all` | `prisma/seed-all.js` | تشغيل كل البذور |
| `seed:staff` | `prisma/seed-staff.js` | موظفون |
| `seed:motorcycles` | `prisma/seed-motorcycles.js` | بيانات دراجات |
| `seed:notifications` | `prisma/seed-admin-notifications.js` | إشعارات |

### الاختبارات (`tests/`)

| الملف | يختبر |
|-------|--------|
| `pagination.test.js` | ترقيم الصفحات |
| `parseRange.test.js` | نطاق التقارير |
| `orderStatusTransition.test.js` | انتقالات حالة الطلب |
| `productOrderMatching.test.js` | مطابقة السائقين |
| `variantImages.test.js` | صور المتغيرات |
| `clientStrip.test.js` | إخفاء accessToken |
| `admin-meta.test.js` | meta الإدارة |
| `users-payload.test.js` | حمولة المستخدمين |

---

## 13. السكربتات والأدوات

| السكربت | الوظيفة |
|---------|---------|
| `scripts/generate-crud-modules.mjs` | توليد وحدات CRUD |
| `scripts/generate-zadway-mobile-postman.mjs` | Postman collection |
| `scripts/patch-route-read-guards.mjs` | تصحيح حراس القراءة |
| `backfill:ride-service-id` | ملء ride service id |
| `backfill:role-permissions` | مزامنة صلاحيات الأدوار |
| `test:user-api` | اختبار endpoints المستخدم |
| `driver:available-smoke` | smoke test للسائق |

### خدمات مساعدة

| المسار | الوظيفة |
|--------|---------|
| `src/services/pdf/` | فواتير PDF + تقارير |
| `src/services/excel/` | تصدير Excel |
| `src/services/productOrders/` | مطابقة الطلبات |
| `src/core/crud/genericCrudService.js` | CRUD عام |
| `src/core/utils/variantImages.js` | fallback صور variant |

---

## 14. ملاحظات مهمة

1. **README القديم** يذكر endpoints قديمة (ride-requests, airports, zones...) — **الكود الفعلي** يستخدم بنية CRUD حديثة موثقة في هذا التقرير.

2. **اسم المشروع:** الحزمة `tovo-backend`، Swagger `Qarora API`، مجلد `qarora` — أسماء متداخلة لنفس المشروع.

3. **عملة المتغيرات:** `ProductVariant.currency` افتراضي **IQD**، بينما الطلبات والمحافظ **SAR** — راجع عند التكامل.

4. **i18n:** حقول `*I18n` (JSON) + `nameAr`/`titleAr` للعربية — middleware يدعم `ar` و `en`.

5. **لا يوجد model RideRequest** في Prisma الحالي — جداول bids/ratings/histories موجودة للإدارة والتوسع المستقبلي.

6. **وحدة mobile:** `src/modules/mobile/customer/mobileCustomer.routes.js` **فارغة** — واجهة العميل عبر `/client`.

7. **الوثائق الهندسية** في `docs/`:
   - `DEVELOPER_ONBOARDING.md`
   - `ARCHITECTURE_OVERVIEW.md`
   - `API_CONTRACT_BASELINE.md`
   - `MODULE_OWNERSHIP_MAP.md`
   - وغيرها

---

## ملحق: قائمة صلاحيات الإدارة الكاملة

```
admin.branding.manage / admin.branding.view
admin.dashboard.view
admin.tracking.view
admin_login_devices.manage / .view
admin_login_history.manage / .view
banners.manage / .view
booking_invoices.manage / .view
booking_location_updates.manage / .view
categories.manage / .view
complaints.manage / .view
coupons.manage / .view
customer_supports.manage / .view
documents.manage / .view
driver_documents.manage / .view
driver_inventory_items.manage / .view
guest_customers.manage / .view
inventory_logs.manage / .view
media.upload.manage
notifications.manage / .view
orders.manage / .view
pages.manage / .view
payments.manage / .view
permissions.manage / .view
product_order_items.manage / .view
product_order_location_updates.manage / .view
product_order_offers.manage / .view
product_types.manage / .view
product_variants.manage / .view
products.manage / .view
push_notifications.manage / .view
reviews.manage / .view
ride_request_bids.manage / .view
ride_request_histories.manage / .view
ride_request_ratings.manage / .view
role_permissions.manage / .view
roles.manage / .view
security_audit_logs.manage / .view
sizes.manage / .view
sos.manage / .view
support_chathistories.manage / .view
user_addresses.manage / .view
user_bank_cards.manage / .view
user_details.manage / .view
user_roles.manage / .view
users.manage / .view
wallet_histories.manage / .view
wallets.manage / .view
withdraw_requests.manage / .view
```

---

*نهاية التقرير — تم إنشاؤه آلياً من تحليل الكود المصدري الكامل للمشروع.*
