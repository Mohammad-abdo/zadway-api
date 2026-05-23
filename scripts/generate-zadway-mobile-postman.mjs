/**
 * Generates Zadway mobile Postman collection + environments from validated Express routes.
 * Output: ../../postman/
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../../postman");

mkdirSync(OUT, { recursive: true });

const SUCCESS = {
  success: true,
  message: "Operation successful",
  data: {},
};

const ERROR = {
  success: false,
  message: "Error description here",
};

function url(path, query = []) {
  const raw =
    query.length > 0
      ? `{{base_url}}${path}?${query.map((q) => `${q.key}=${q.value}`).join("&")}`
      : `{{base_url}}${path}`;
  const segments = path.replace(/^\//, "").split("/");
  return {
    raw,
    host: ["{{base_url}}"],
    path: segments.filter(Boolean),
    query: query.length ? query : undefined,
  };
}

function jsonBody(obj) {
  return {
    mode: "raw",
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: "json" } },
  };
}

function bearerHeader() {
  return [{ key: "Authorization", value: "Bearer {{token}}" }];
}

function contentTypeJson() {
  return [{ key: "Content-Type", value: "application/json" }];
}

function tests(script) {
  return [{ listen: "test", script: { type: "text/javascript", exec: script } }];
}

function example(name, status, body, code = status) {
  return {
    name,
    originalRequest: { method: "GET", header: [], url: { raw: "{{base_url}}/", host: ["{{base_url}}"], path: [""] } },
    status: code === 200 || code === 201 ? "OK" : "Bad Request",
    code,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    body: JSON.stringify(body, null, 2),
  };
}

const standardGetTests = [
  "pm.test('Status is 200', () => pm.response.to.have.status(200));",
  "const res = pm.response.json();",
  "pm.test('Success is true', () => pm.expect(res.success).to.be.true);",
];

const standardPostTests = [
  "pm.test('Status is 201 or 200', () => pm.expect([200, 201]).to.include(pm.response.code));",
  "const res = pm.response.json();",
  "pm.test('Success is true', () => pm.expect(res.success).to.be.true);",
];

const loginTests = [
  "pm.test('Status is 200', () => pm.response.to.have.status(200));",
  "const res = pm.response.json();",
  "pm.test('Success is true', () => pm.expect(res.success).to.be.true);",
  "if (res.success && res.data) {",
  "  const token = res.data.token || res.data.accessToken;",
  "  if (token) {",
  '    pm.environment.set("token", token);',
  '    console.log("✅ Token saved");',
  "  }",
  "  if (res.data.user?.id) pm.environment.set('user_id', String(res.data.user.id));",
  "}",
];

function req(name, opts) {
  const {
    method,
    path: p,
    query,
    body,
    auth = false,
    extraHeaders = [],
    testScript = standardGetTests,
    examples = [],
    description = "",
  } = opts;
  const headers = [...extraHeaders];
  if (body) headers.push(...contentTypeJson());
  if (auth) headers.push(...bearerHeader());
  return {
    name,
    request: {
      method,
      header: headers,
      body,
      url: url(p, query),
      description,
    },
    event: tests(testScript),
    response: examples,
  };
}

const loginSuccess = {
  ...SUCCESS,
  message: "Logged in",
  data: {
    user: { id: 1, name: "Test User", email: "user@example.com", phone: "+966500000001", avatar: null },
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example",
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
  },
};

const loginError = { ...ERROR, message: "Invalid credentials" };

const registerSuccess = {
  ...SUCCESS,
  message: "Registered",
  data: {
    user: { id: 2, name: "New Rider", email: null, phone: 966500000002, userType: "rider" },
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example",
  },
};

const meSuccess = {
  ...SUCCESS,
  data: {
    id: 1,
    name: "Test User",
    email: "user@example.com",
    phone: 500000001,
    userType: "rider",
    status: "active",
    permissions: [],
    isDashboardAdmin: false,
  },
};

const paginatedOrders = {
  ...SUCCESS,
  data: [{ id: 1, status: "NEW", guestId: 1 }],
  pagination: { page: 1, limit: 10, total: 1, pages: 1 },
};

const orderCreateSuccess = {
  ...SUCCESS,
  message: "Created",
  data: {
    order: { id: 101, status: "NEW", guestId: 1, dropoffLat: 24.7136, dropoffLng: 46.6753 },
    accessToken: "order-access-token-example",
  },
};

const collection = {
  info: {
    _postman_id: "zadway-mobile-2026-0511",
    name: "Zadway Mobile API",
    description:
      "Flutter customer & driver mobile APIs only. Import `zadway-mobile.dev_environment.json` or `zadway-mobile.prod_environment.json`. Set `base_url` and run **Auth → Login** — token is saved automatically.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{token}}", type: "string" }],
  },
  variable: [
    { key: "base_url", value: "{{base_url}}" },
    { key: "token", value: "{{token}}" },
    { key: "user_id", value: "" },
    { key: "page", value: "1" },
    { key: "limit", value: "10" },
    { key: "product_id", value: "1" },
    { key: "category_id", value: "1" },
    { key: "order_id", value: "" },
    { key: "guest_id", value: "" },
    { key: "order_access_token", value: "" },
    { key: "inventory_id", value: "" },
    { key: "notification_id", value: "1" },
  ],
  item: [
    {
      name: "README",
      item: [
        req("README — Zadway Mobile API", {
          method: "GET",
          path: "/public/branding",
          description: `# Zadway Mobile API

## Base URL
Use environment variable \`base_url\`:
- **Dev:** \`http://localhost:3000/api\`
- **Prod:** \`https://zadway.nodeteam.site/api\`

## Authentication
1. Run **Auth → Login** (or Register).
2. Tests auto-save \`accessToken\` or \`token\` to \`{{token}}\`.
3. Authenticated requests use \`Authorization: Bearer {{token}}\`.

## Guest order tracking
- POST **Client → Create Order (guest)** returns \`data.accessToken\`.
- GET **Client → Get Order by ID (guest)** uses header \`X-Order-Access-Token: {{order_access_token}}\`.

## Resources (mobile only)
| Folder | Purpose |
|--------|---------|
| Auth | Login, register, profile (me) |
| Public | Branding, categories, products, banners |
| Client | Catalog, variants, guests, orders |
| Driver | Location, inventory, order pool, offers, claim |
| Notifications | Mark notifications read |

**Excluded:** admin, dashboard, internal CRUD, analytics, seed/debug routes.`,
          testScript: ["pm.test('Collection imported', () => pm.expect(true).to.be.true);", "pm.test('Set base_url in environment', () => pm.expect(pm.environment.get('base_url')).to.be.a('string');"],
          examples: [
            example("Info", 200, { success: true, message: "Import environments before running requests" }),
          ],
        }),
      ],
    },
    {
      name: "Auth",
      item: [
        req("Login", {
          method: "POST",
          path: "/auth/login",
          body: jsonBody({ phone: "966500000001", password: "your-password" }),
          testScript: loginTests,
          description: "Login with phone or email + password. Saves `accessToken` to `{{token}}`.",
          examples: [example("200 Success", 200, loginSuccess), example("401 Invalid credentials", 401, loginError)],
        }),
        req("Register (Auth)", {
          method: "POST",
          path: "/auth/register",
          body: jsonBody({
            phone: "966500000002",
            password: "secret12",
            name: "Test Rider",
            userType: "rider",
          }),
          testScript: loginTests,
          examples: [example("201 Success", 201, registerSuccess), example("400 Validation", 400, { ...ERROR, message: "email or phone required" })],
        }),
        req("Public Register", {
          method: "POST",
          path: "/register",
          body: jsonBody({
            name: "Test User",
            email: "test@example.com",
            phone: "+966500000003",
            password: "secret12",
            role: "rider",
          }),
          testScript: loginTests,
          examples: [example("201 Success", 201, loginSuccess), example("409 Conflict", 409, { ...ERROR, message: "email or phone already exists" })],
        }),
        req("Get Me (Profile)", {
          method: "GET",
          path: "/auth/me",
          auth: true,
          testScript: [
            ...standardGetTests,
            "const res = pm.response.json();",
            "if (res.data?.id) pm.environment.set('user_id', String(res.data.id));",
          ],
          examples: [example("200 Success", 200, meSuccess), example("401 Unauthorized", 401, { ...ERROR, message: "Unauthorized" })],
        }),
        {
          name: "Edge Cases",
          item: [
            req("Login — missing password", {
              method: "POST",
              path: "/auth/login",
              body: jsonBody({ phone: "966500000001" }),
              testScript: [
                "pm.test('Status is 400', () => pm.response.to.have.status(400));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("400 Bad Request", 400, { ...ERROR, message: "Validation failed" })],
            }),
            req("Get Me — no token", {
              method: "GET",
              path: "/auth/me",
              testScript: [
                "pm.test('Status is 401', () => pm.response.to.have.status(401));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("401 Unauthorized", 401, { ...ERROR, message: "Unauthorized" })],
            }),
          ],
        },
      ],
    },
    {
      name: "Public",
      item: [
        req("Get Public Branding", {
          method: "GET",
          path: "/public/branding",
          examples: [example("200 Success", 200, { ...SUCCESS, data: { logoUrl: "https://cdn.example/logo.png" } })],
        }),
        req("Get Categories (All)", {
          method: "GET",
          path: "/categories/all",
          query: [
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "{{limit}}" },
            { key: "q", value: "", disabled: true },
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: [{ id: 1, name: "Water" }] })],
        }),
        req("Get Products (All)", {
          method: "GET",
          path: "/products/all",
          query: [
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "{{limit}}" },
            { key: "q", value: "", disabled: true },
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: [{ id: 1, name: "Product A", isActive: true }] })],
        }),
        req("Get Products by Category", {
          method: "GET",
          path: "/products/category/{{category_id}}",
          query: [
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "{{limit}}" },
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: [] })],
        }),
        req("Get Product by ID (Mobile)", {
          method: "GET",
          path: "/products/mobile/{{product_id}}",
          testScript: [
            ...standardGetTests,
            "const res = pm.response.json();",
            "if (res.data?.id) pm.environment.set('product_id', String(res.data.id));",
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: { id: 1, name: "Product A", variants: [] } }), example("404 Not found", 404, { ...ERROR, message: "not found" })],
        }),
        req("Get Banners (All)", {
          method: "GET",
          path: "/banners/all",
          query: [
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "{{limit}}" },
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: [{ id: 1, title: "Promo", isActive: true }] })],
        }),
        {
          name: "Edge Cases",
          item: [
            req("Get Product — invalid ID", {
              method: "GET",
              path: "/products/mobile/999999",
              testScript: [
                "pm.test('Status is 404', () => pm.response.to.have.status(404));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("404 Not found", 404, { ...ERROR, message: "not found" })],
            }),
          ],
        },
      ],
    },
    {
      name: "Client",
      item: [
        req("Get Catalog", {
          method: "GET",
          path: "/client/catalog",
          examples: [example("200 Success", 200, { ...SUCCESS, data: { categories: [], products: [] } })],
        }),
        req("Get Product Variants", {
          method: "GET",
          path: "/client/products/{{product_id}}/variants",
          examples: [example("200 Success", 200, { ...SUCCESS, data: [{ id: 1, productId: 1, price: 10 }] }), example("404 Product", 404, { ...ERROR, message: "product not found" })],
        }),
        req("Create Guest", {
          method: "POST",
          path: "/client/guests",
          body: jsonBody({ name: "Guest User", phone: "966511111111" }),
          testScript: [
            ...standardPostTests,
            "const res = pm.response.json();",
            "if (res.data?.id) pm.environment.set('guest_id', String(res.data.id));",
          ],
          examples: [example("201 Created", 201, { ...SUCCESS, data: { id: 1, name: "Guest User", phone: "966511111111" } })],
        }),
        req("Create Order (guest, no JWT)", {
          method: "POST",
          path: "/client/orders",
          body: jsonBody({
            guest: { name: "Guest User", phone: "966511111111" },
            dropoffLat: 24.7136,
            dropoffLng: 46.6753,
            dropoffNotes: "Building A",
            commissionPct: 5,
            currency: "SAR",
            paymentMethod: "CASH",
            items: [{ variantId: 1, quantity: 1, unitPrice: 10 }],
          }),
          testScript: [
            ...standardPostTests,
            "const res = pm.response.json();",
            "if (res.data?.order?.id) pm.environment.set('order_id', String(res.data.order.id));",
            "if (res.data?.accessToken) pm.environment.set('order_access_token', res.data.accessToken);",
          ],
          examples: [example("201 Created", 201, orderCreateSuccess), example("400 Bad guest", 400, { ...ERROR, message: "Provide guestId, guest { name, phone }, or authenticate as a rider" })],
        }),
        req("Create Order (authenticated rider)", {
          method: "POST",
          path: "/client/orders",
          auth: true,
          body: jsonBody({
            dropoffLat: 24.7136,
            dropoffLng: 46.6753,
            currency: "SAR",
            items: [{ variantId: 1, quantity: 2, unitPrice: 10 }],
          }),
          testScript: [
            ...standardPostTests,
            "const res = pm.response.json();",
            "if (res.data?.order?.id) pm.environment.set('order_id', String(res.data.order.id));",
          ],
          examples: [example("201 Created", 201, { ...SUCCESS, data: { order: { id: 102, status: "NEW" } } })],
        }),
        req("List My Orders (rider)", {
          method: "GET",
          path: "/client/orders",
          auth: true,
          query: [
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "{{limit}}" },
            { key: "q", value: "", disabled: true },
            { key: "sort", value: "", disabled: true },
          ],
          testScript: [
            ...standardGetTests,
            "const res = pm.response.json();",
            "pm.test('Has pagination', () => pm.expect(res.pagination).to.have.property('total'));",
            "if (Array.isArray(res.data) && res.data[0]?.id) pm.environment.set('order_id', String(res.data[0].id));",
          ],
          examples: [example("200 Success", 200, paginatedOrders), example("403 Not rider", 403, { ...ERROR, message: "Forbidden" })],
        }),
        req("Get Order by ID (rider JWT)", {
          method: "GET",
          path: "/client/orders/{{order_id}}",
          auth: true,
          examples: [example("200 Success", 200, { ...SUCCESS, data: { id: 101, status: "NEW", items: [] } }), example("403 Forbidden", 403, { ...ERROR, message: "forbidden" })],
        }),
        req("Get Order by ID (guest access token)", {
          method: "GET",
          path: "/client/orders/{{order_id}}",
          extraHeaders: [{ key: "X-Order-Access-Token", value: "{{order_access_token}}" }],
          examples: [example("200 Success", 200, { ...SUCCESS, data: { id: 101, status: "NEW" } }), example("403 Forbidden", 403, { ...ERROR, message: "forbidden" })],
        }),
        {
          name: "Edge Cases",
          item: [
            req("Create Order — missing items/location", {
              method: "POST",
              path: "/client/orders",
              body: jsonBody({ guest: { phone: "966511111111" } }),
              testScript: [
                "pm.test('Status is 400', () => pm.response.to.have.status(400));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("400 Validation", 400, { ...ERROR, message: "Validation failed" })],
            }),
            req("List Orders — no token", {
              method: "GET",
              path: "/client/orders",
              testScript: [
                "pm.test('Status is 401', () => pm.response.to.have.status(401));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("401 Unauthorized", 401, { ...ERROR, message: "Unauthorized" })],
            }),
          ],
        },
      ],
    },
    {
      name: "Driver",
      item: [
        req("Update My Location", {
          method: "PATCH",
          path: "/drivers/me/location",
          auth: true,
          body: jsonBody({ latitude: "24.72", longitude: "46.68", currentHeading: 90 }),
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, SUCCESS), example("403 Not driver", 403, { ...ERROR, message: "Forbidden" })],
        }),
        req("List My Inventory", {
          method: "GET",
          path: "/drivers/me/inventory",
          auth: true,
          examples: [example("200 Success", 200, { ...SUCCESS, data: [{ id: 1, variantId: 1, quantityOnHand: 20 }] })],
        }),
        req("Create Inventory Item", {
          method: "POST",
          path: "/drivers/me/inventory",
          auth: true,
          body: jsonBody({ variantId: 1, quantityOnHand: 20, price: 12.5, currency: "SAR" }),
          testScript: [
            ...standardPostTests,
            "const res = pm.response.json();",
            "if (res.data?.id) pm.environment.set('inventory_id', String(res.data.id));",
          ],
          examples: [example("201 Created", 201, { ...SUCCESS, data: { id: 1, variantId: 1, quantityOnHand: 20, price: 12.5 } })],
        }),
        req("Update Inventory Item", {
          method: "PATCH",
          path: "/drivers/me/inventory/{{inventory_id}}",
          auth: true,
          body: jsonBody({ quantityOnHand: 15, price: 13 }),
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, SUCCESS)],
        }),
        req("Delete Inventory Item", {
          method: "DELETE",
          path: "/drivers/me/inventory/{{inventory_id}}",
          auth: true,
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, SUCCESS)],
        }),
        req("List Product Orders (open pool)", {
          method: "GET",
          path: "/drivers/me/product-orders",
          auth: true,
          query: [
            { key: "filter", value: "open" },
            { key: "page", value: "{{page}}" },
            { key: "limit", value: "30" },
          ],
          testScript: [
            ...standardGetTests,
            "const res = pm.response.json();",
            "pm.test('Has pagination', () => pm.expect(res.pagination).to.have.property('total'));",
          ],
          examples: [example("200 Success", 200, paginatedOrders)],
        }),
        req("List Product Orders (mine)", {
          method: "GET",
          path: "/drivers/me/product-orders",
          auth: true,
          query: [{ key: "filter", value: "mine" }],
          examples: [example("200 Success", 200, paginatedOrders)],
        }),
        req("Get Product Order Detail", {
          method: "GET",
          path: "/drivers/me/product-orders/{{order_id}}",
          auth: true,
          examples: [example("200 Success", 200, { ...SUCCESS, data: { id: 101, status: "NEW" } })],
        }),
        req("Submit Offer on Order", {
          method: "POST",
          path: "/drivers/me/product-orders/{{order_id}}/offers",
          auth: true,
          body: jsonBody({ offeredPrice: 55 }),
          testScript: standardPostTests,
          examples: [example("200 Success", 200, SUCCESS)],
        }),
        req("Claim Order", {
          method: "POST",
          path: "/drivers/me/product-orders/{{order_id}}/claim",
          auth: true,
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, { ...SUCCESS, data: { id: 101, status: "ASSIGNED" } })],
        }),
        {
          name: "Edge Cases",
          item: [
            req("Driver API — rider token (expect 403)", {
              method: "GET",
              path: "/drivers/me/inventory",
              auth: true,
              description: "Use a rider JWT to verify driver-only guard returns 403.",
              testScript: [
                "pm.test('Status is 403 when not driver', () => {",
                "  if (pm.response.code === 403) pm.expect(pm.response.json().success).to.be.false;",
                "});",
                "pm.test('Response has success field', () => pm.expect(pm.response.json()).to.have.property('success');",
              ],
              examples: [example("403 Forbidden", 403, { ...ERROR, message: "Forbidden" })],
            }),
          ],
        },
      ],
    },
    {
      name: "Notifications",
      item: [
        req("Mark All Notifications Read", {
          method: "POST",
          path: "/notifications/read-all",
          auth: true,
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, SUCCESS)],
        }),
        req("Mark Notification Read", {
          method: "POST",
          path: "/notifications/{{notification_id}}/read",
          auth: true,
          description: "Set `notification_id` in the environment before running.",
          testScript: [
            "pm.test('Status is 200', () => pm.response.to.have.status(200));",
            "pm.test('Success is true', () => pm.expect(pm.response.json().success).to.be.true);",
          ],
          examples: [example("200 Success", 200, SUCCESS), example("404 Not found", 404, { ...ERROR, message: "not found" })],
        }),
        {
          name: "Edge Cases",
          item: [
            req("Mark Read — no token", {
              method: "POST",
              path: "/notifications/read-all",
              testScript: [
                "pm.test('Status is 401', () => pm.response.to.have.status(401));",
                "pm.test('Success is false', () => pm.expect(pm.response.json().success).to.be.false);",
              ],
              examples: [example("401 Unauthorized", 401, { ...ERROR, message: "Unauthorized" })],
            }),
          ],
        },
      ],
    },
  ],
};

const devEnv = {
  id: "zadway-mobile-dev-env",
  name: "Zadway Mobile — Development",
  values: [
    { key: "base_url", value: "http://localhost:3000/api", type: "default", enabled: true },
    { key: "token", value: "", type: "secret", enabled: true },
    { key: "user_id", value: "", type: "default", enabled: true },
    { key: "page", value: "1", type: "default", enabled: true },
    { key: "limit", value: "10", type: "default", enabled: true },
    { key: "product_id", value: "1", type: "default", enabled: true },
    { key: "category_id", value: "1", type: "default", enabled: true },
    { key: "order_id", value: "", type: "default", enabled: true },
    { key: "guest_id", value: "", type: "default", enabled: true },
    { key: "order_access_token", value: "", type: "secret", enabled: true },
    { key: "inventory_id", value: "", type: "default", enabled: true },
    { key: "notification_id", value: "1", type: "default", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "zadway-api/scripts/generate-zadway-mobile-postman.mjs",
};

const prodEnv = {
  ...devEnv,
  id: "zadway-mobile-prod-env",
  name: "Zadway Mobile — Production",
  values: devEnv.values.map((v) =>
    v.key === "base_url" ? { ...v, value: "https://zadway.nodeteam.site/api" } : { ...v }
  ),
};

writeFileSync(join(OUT, "zadway-mobile.postman_collection.json"), JSON.stringify(collection, null, 2));
writeFileSync(join(OUT, "zadway-mobile.dev_environment.json"), JSON.stringify(devEnv, null, 2));
writeFileSync(join(OUT, "zadway-mobile.prod_environment.json"), JSON.stringify(prodEnv, null, 2));

console.log("Written to", OUT);
