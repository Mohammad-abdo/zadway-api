/**
 * Smoke test: captain signup with documents -> gated -> admin approves -> active.
 * Usage: node scripts/driver-onboarding-smoke.mjs [baseUrl] (needs ADMIN_EMAIL / ADMIN_PASSWORD or seeded admin).
 */
const base = process.argv[2] || "http://localhost:3000/api";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function call(path, { method = "GET", token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${base}${path}`, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(cond, msg, extra) {
  if (!cond) {
    console.error("FAIL:", msg, extra ? JSON.stringify(extra) : "");
    process.exit(1);
  }
  console.log("ok -", msg);
}

const phone = `+96477${String(Date.now()).slice(-8)}`;
const form = new FormData();
form.append("name", "Smoke Captain");
form.append("phone", phone);
form.append("password", "secret123");
form.append("carModel", "Kia Bongo");
form.append("carPlateNumber", "BGD-1234");
for (const key of ["national_id_front", "national_id_back", "driving_license", "vehicle_registration"]) {
  form.append(key, new Blob([png], { type: "image/png" }), `${key}.png`);
}

const missingForm = new FormData();
missingForm.append("name", "x");
missingForm.append("phone", `+96478${String(Date.now()).slice(-8)}`);
missingForm.append("password", "secret123");
const missing = await call("/auth/driver/register", { method: "POST", form: missingForm });
assert(missing.status === 400, "rejects signup without required documents", missing.data);

const reg = await call("/auth/driver/register", { method: "POST", form });
assert(reg.status === 201 && reg.data?.data?.user?.status === "pending", "captain registered as pending", reg.data);
const driverToken = reg.data.data.accessToken;
const driverId = reg.data.data.user.id;

const gated = await call("/drivers/me/inventory", { token: driverToken });
assert(gated.status === 403 && gated.data?.code === "driver_not_approved", "pending captain is gated", gated.data);

const onb = await call("/drivers/me/onboarding", { token: driverToken });
assert(onb.status === 200 && onb.data.data.documents.length === 5, "onboarding returns 5 document slots", onb.data);

let adminToken = process.env.ADMIN_TOKEN;
if (!adminToken) {
  const admin = await call("/auth/login", {
    method: "POST",
    json: {
      email: process.env.ADMIN_EMAIL || "admin@admin.com",
      password: process.env.ADMIN_PASSWORD || "password",
    },
  });
  assert(admin.status === 200, "admin login", admin.data);
  adminToken = admin.data.data.accessToken;
}

const list = await call("/admin/drivers/review?status=pending", { token: adminToken });
assert(list.status === 200 && list.data.data.items.some((d) => d.id === driverId), "admin sees pending captain", list.data);

const rej = await call(`/admin/drivers/${driverId}/reject`, {
  method: "POST",
  token: adminToken,
  json: { reason: "ID is blurry", documentIds: [onb.data.data.documents[0].id] },
});
assert(rej.status === 200 && rej.data.data.driver.status === "rejected", "admin rejects with reason", rej.data);

const reupload = new FormData();
reupload.append("national_id_front", new Blob([png], { type: "image/png" }), "id.png");
const re = await call("/drivers/me/onboarding/documents", { method: "PUT", token: driverToken, form: reupload });
assert(re.status === 200 && re.data.data.status === "pending", "captain re-uploads and returns to pending", re.data);

const ok = await call(`/admin/drivers/${driverId}/approve`, { method: "POST", token: adminToken });
assert(ok.status === 200 && ok.data.data.driver.status === "active", "admin approves captain", ok.data);

const open = await call("/drivers/me/inventory", { token: driverToken });
assert(open.status === 200, "approved captain has full access", open.data);

const settings = await call("/admin/settings", { token: adminToken });
assert(settings.status === 200 && "commissionEnabled" in settings.data.data, "settings expose commissionEnabled", settings.data);

console.log("\nAll driver onboarding checks passed.");
