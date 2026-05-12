import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function nowPlusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function pickFreePhone(preferred, email) {
  let phone = preferred;
  for (let i = 0; i < 50; i += 1) {
    // phone is unique; if taken by the same user, we can reuse it
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (!existing) return phone;
    if (existing.email && existing.email === email) return phone;
    phone += 1;
  }
  // fallback: let Prisma store null if we can't find quickly
  return null;
}

async function findOrCreate(model, where, create) {
  const existing = await model.findFirst({ where });
  if (existing) return existing;
  return await model.create({ data: create });
}

async function main() {
  // Seed credentials (use these to login to admin dashboard)
  const ADMIN_EMAIL = "admin@admin.com";
  const ADMIN_PASSWORD_PLAIN = "admin123";
  const SEED_PASSWORD_PLAIN = "password";
  const ADMIN_PASSWORD = bcrypt.hashSync(ADMIN_PASSWORD_PLAIN, 10);
  const SEED_PASSWORD = bcrypt.hashSync(SEED_PASSWORD_PLAIN, 10);

  // ---- Users (admin/driver/rider) ----
  const adminPhone = await pickFreePhone(1000000001, ADMIN_EMAIL);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      status: "active",
      userType: "admin",
      password: ADMIN_PASSWORD,
    },
    create: {
      name: "Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      phone: adminPhone,
      userType: "admin",
      status: "active",
      isVerified: true,
    },
  });

  const driverEmail = "driver@qarora.com";
  const driverPhone = await pickFreePhone(1000000002, driverEmail);
  const driver = await prisma.user.upsert({
    where: { email: driverEmail },
    update: { status: "active", userType: "driver", isAvailable: true },
    create: {
      name: "Driver",
      email: driverEmail,
      password: SEED_PASSWORD,
      phone: driverPhone,
      userType: "driver",
      status: "active",
      isVerified: true,
      isAvailable: true,
      latitude: "33.3152",
      longitude: "44.3661",
    },
  });

  const riderEmail = "customer@qarora.local";
  const riderPhone = await pickFreePhone(1000000003, riderEmail);
  const rider = await prisma.user.upsert({
    where: { email: riderEmail },
    update: { status: "active", userType: "rider" },
    create: {
      name: "Rider",
      email: riderEmail,
      password: SEED_PASSWORD,
      phone: riderPhone,
      userType: "rider",
      status: "active",
      isVerified: true,
      latitude: "33.3128",
      longitude: "44.3615",
    },
  });

  // ---- Roles/Permissions (admin dashboard + API RBAC) ----
  const GUARD = "web";

  /** Every `*.manage` used by API route mutators; each gets a matching `*.view` for GET list/detail. */
  const ADMIN_MANAGE_PERMISSIONS = [
    "admin.branding.manage",
    "admin_login_devices.manage",
    "admin_login_history.manage",
    "banners.manage",
    "booking_invoices.manage",
    "booking_location_updates.manage",
    "categories.manage",
    "complaints.manage",
    "coupons.manage",
    "customer_supports.manage",
    "documents.manage",
    "driver_documents.manage",
    "driver_inventory_items.manage",
    "guest_customers.manage",
    "media.upload.manage",
    "inventory_logs.manage",
    "notifications.manage",
    "orders.manage",
    "pages.manage",
    "payments.manage",
    "permissions.manage",
    "product_order_items.manage",
    "product_order_location_updates.manage",
    "product_order_offers.manage",
    "product_types.manage",
    "product_variants.manage",
    "products.manage",
    "push_notifications.manage",
    "reviews.manage",
    "ride_request_bids.manage",
    "ride_request_histories.manage",
    "ride_request_ratings.manage",
    "role_permissions.manage",
    "roles.manage",
    "security_audit_logs.manage",
    "sizes.manage",
    "sos.manage",
    "support_chathistories.manage",
    "user_addresses.manage",
    "user_bank_cards.manage",
    "user_details.manage",
    "user_roles.manage",
    "users.manage",
    "wallet_histories.manage",
    "wallets.manage",
    "withdraw_requests.manage",
  ];

  const PAGE_VIEW_PERMISSIONS = ["admin.dashboard.view", "admin.tracking.view"];

  const allPermissionNames = new Set(PAGE_VIEW_PERMISSIONS);
  for (const m of ADMIN_MANAGE_PERMISSIONS) {
    allPermissionNames.add(m);
    allPermissionNames.add(m.replace(/\.manage$/, ".view"));
  }

  const permByName = {};
  for (const name of allPermissionNames) {
    permByName[name] = await prisma.permission.upsert({
      where: { name_guardName: { name, guardName: GUARD } },
      update: {},
      create: { name, guardName: GUARD },
    });
  }

  const roleAdmin = await prisma.role.upsert({
    where: { name_guardName: { name: "admin", guardName: GUARD } },
    update: {},
    create: { name: "admin", guardName: GUARD },
  });

  const roleManager = await prisma.role.upsert({
    where: { name_guardName: { name: "manager", guardName: GUARD } },
    update: {},
    create: { name: "manager", guardName: GUARD },
  });

  const roleEditor = await prisma.role.upsert({
    where: { name_guardName: { name: "editor", guardName: GUARD } },
    update: {},
    create: { name: "editor", guardName: GUARD },
  });

  const roleDriver = await prisma.role.upsert({
    where: { name_guardName: { name: "driver", guardName: GUARD } },
    update: {},
    create: { name: "driver", guardName: GUARD },
  });

  const roleRider = await prisma.role.upsert({
    where: { name_guardName: { name: "rider", guardName: GUARD } },
    update: {},
    create: { name: "rider", guardName: GUARD },
  });

  async function replaceRolePermissions(roleId, names) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    const rows = [...new Set(names)]
      .map((n) => permByName[n]?.id)
      .filter(Boolean)
      .map((permissionId) => ({ roleId, permissionId }));
    if (rows.length) {
      await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    }
  }

  const adminAllNames = [...allPermissionNames];
  await replaceRolePermissions(roleAdmin.id, adminAllNames);

  const managerManages = [
    "orders.manage",
    "products.manage",
    "categories.manage",
    "product_types.manage",
    "sizes.manage",
    "product_variants.manage",
    "coupons.manage",
    "banners.manage",
    "guest_customers.manage",
    "media.upload.manage",
    "complaints.manage",
    "customer_supports.manage",
    "notifications.manage",
    "payments.manage",
    "wallets.manage",
    "withdraw_requests.manage",
    "product_order_items.manage",
    "product_order_offers.manage",
    "reviews.manage",
    "users.manage",
    "driver_documents.manage",
    "documents.manage",
    "product_order_location_updates.manage",
    "driver_inventory_items.manage",
    "inventory_logs.manage",
    "roles.manage",
    "permissions.manage",
    "user_roles.manage",
    "role_permissions.manage",
    "admin.branding.manage",
  ];
  const managerNames = new Set([...PAGE_VIEW_PERMISSIONS, "admin.branding.view"]);
  for (const m of managerManages) {
    managerNames.add(m);
    managerNames.add(m.replace(/\.manage$/, ".view"));
  }
  await replaceRolePermissions(roleManager.id, [...managerNames]);

  const editorNames = [...allPermissionNames].filter((n) => n.endsWith(".view"));
  await replaceRolePermissions(roleEditor.id, editorNames);

  const managerEmail = "manager@qarora.local";
  const editorEmail = "editor@qarora.local";
  const managerPhone = await pickFreePhone(1000000011, managerEmail);
  const editorPhone = await pickFreePhone(1000000012, editorEmail);
  const managerUser = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { userType: "staff", status: "active", password: SEED_PASSWORD },
    create: {
      name: "Manager",
      email: managerEmail,
      password: SEED_PASSWORD,
      phone: managerPhone,
      userType: "staff",
      status: "active",
      isVerified: true,
    },
  });
  const editorUser = await prisma.user.upsert({
    where: { email: editorEmail },
    update: { userType: "staff", status: "active", password: SEED_PASSWORD },
    create: {
      name: "Editor",
      email: editorEmail,
      password: SEED_PASSWORD,
      phone: editorPhone,
      userType: "staff",
      status: "active",
      isVerified: true,
    },
  });

  await prisma.userRole.createMany({
    data: [
      { userId: admin.id, roleId: roleAdmin.id },
      { userId: driver.id, roleId: roleDriver.id },
      { userId: rider.id, roleId: roleRider.id },
      { userId: managerUser.id, roleId: roleManager.id },
      { userId: editorUser.id, roleId: roleEditor.id },
    ],
    skipDuplicates: true,
  });

  // ---- Wallets ----
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, balance: 0, currency: "SAR" },
  });
  await prisma.wallet.upsert({
    where: { userId: driver.id },
    update: { balance: 50 },
    create: { userId: driver.id, balance: 50, currency: "SAR" },
  });
  await prisma.wallet.upsert({
    where: { userId: rider.id },
    update: { balance: 25 },
    create: { userId: rider.id, balance: 25, currency: "SAR" },
  });
  await prisma.wallet.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: { userId: managerUser.id, balance: 0, currency: "SAR" },
  });
  await prisma.wallet.upsert({
    where: { userId: editorUser.id },
    update: {},
    create: { userId: editorUser.id, balance: 0, currency: "SAR" },
  });

  // ---- User details (driver car) ----
  await prisma.userDetail.upsert({
    where: { userId: driver.id },
    update: {},
    create: {
      userId: driver.id,
      carModel: "Toyota",
      carColor: "White",
      carPlateNumber: "SEED-1234",
      carProductionYear: 2022,
      workAddress: "Seed Work Address",
      homeAddress: "Seed Home Address",
      workLatitude: "33.3100",
      workLongitude: "44.3600",
      homeLatitude: "33.3200",
      homeLongitude: "44.3700",
    },
  });

  // ---- Driver documents ----
  const docLicense = await prisma.document.upsert({
    where: { id: 1 },
    update: { name: "Driver License" },
    create: {
      id: 1,
      name: "Driver License",
      type: "license",
      isRequired: true,
      hasExpiryDate: true,
    },
  });

  await findOrCreate(
    prisma.driverDocument,
    { driverId: driver.id, documentId: docLicense.id },
    {
      driverId: driver.id,
      documentId: docLicense.id,
      isVerified: true,
      documentImage: "https://example.com/license.png",
      expireDate: new Date(new Date().getFullYear() + 1, 0, 1),
    },
  );

  // ---- Addresses / Cards ----
  await findOrCreate(
    prisma.userAddress,
    { userId: rider.id, title: "Home" },
    {
      userId: rider.id,
      title: "Home",
      address: "Seed Address",
      latitude: "33.3130",
      longitude: "44.3620",
      isDefault: true,
    },
  );

  await findOrCreate(
    prisma.userBankCard,
    { userId: rider.id, lastFourDigits: "4242" },
    {
      userId: rider.id,
      cardHolderName: "Seed Rider",
      lastFourDigits: "4242",
      brand: "VISA",
      expiryMonth: 12,
      expiryYear: new Date().getFullYear() + 2,
      isDefault: true,
    },
  );

  // ---- Catalog: category/product/type/size/variant ----
  const category = await findOrCreate(
    prisma.category,
    { name: "Beverages" },
    {
      name: "Beverages",
      nameI18n: { en: "Beverages", ar: "مشروبات" },
      description: "Seed category",
      descriptionI18n: { en: "Seed category", ar: "تصنيف تجريبي" },
      image_url: "https://example.com/category.png",
    },
  );

  const product = await findOrCreate(
    prisma.product,
    { name: "Seed Water" },
    {
      name: "Seed Water",
      nameI18n: { en: "Seed Water", ar: "ماء تجريبي" },
      description: "Seed product",
      descriptionI18n: { en: "Seed product", ar: "منتج تجريبي" },
      categoryId: category.id,
      imageUrl: "https://example.com/product.png",
      images: ["https://example.com/product.png", "https://example.com/product2.png"],
      isActive: true,
    },
  );

  const size = await prisma.size.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Small",
      nameAr: "صغير",
      nameI18n: { en: "Small", ar: "صغير" },
    },
  });

  const size2 = await prisma.size.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "Large",
      nameAr: "كبير",
      nameI18n: { en: "Large", ar: "كبير" },
    },
  });

  const productType = await prisma.productType.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Bottle",
      nameAr: "عبوة",
      nameI18n: { en: "Bottle", ar: "عبوة" },
    },
  });

  const productType2 = await prisma.productType.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "Pack",
      nameAr: "علبة",
      nameI18n: { en: "Pack", ar: "علبة" },
    },
  });

  // Match by stable seed SKU so re-runs and DBs migrated from @@unique([productId]) stay idempotent
  // (old rows may share productId but differ in size/type until updated).
  const waterSku = `SEED-WATER-${product.id}`;
  const variant = await prisma.productVariant.upsert({
    where: { sku: waterSku },
    update: {
      productId: product.id,
      sizeId: size.id,
      typeId: productType.id,
      price: 1.5,
      stock: 10,
      currency: "SAR",
    },
    create: {
      productId: product.id,
      sizeId: size.id,
      typeId: productType.id,
      price: 1.5,
      stock: 10,
      sku: waterSku,
      currency: "SAR",
    },
  });

  const category2 = await findOrCreate(
    prisma.category,
    { name: "Snacks" },
    {
      name: "Snacks",
      nameI18n: { en: "Snacks", ar: "سناكات" },
      description: "Seed snacks category",
      descriptionI18n: { en: "Seed snacks category", ar: "تصنيف سناكات تجريبي" },
      image_url: "https://example.com/category-snacks.png",
    }
  );

  const product2 = await findOrCreate(
    prisma.product,
    { name: "Seed Chips" },
    {
      name: "Seed Chips",
      nameI18n: { en: "Seed Chips", ar: "شيبس تجريبي" },
      description: "Seed chips product",
      descriptionI18n: { en: "Seed chips product", ar: "منتج شيبس تجريبي" },
      categoryId: category2.id,
      imageUrl: "https://example.com/chips.png",
      images: ["https://example.com/chips.png"],
      isActive: true,
    }
  );

  const chipsSku = `SEED-CHIPS-${product2.id}`;
  await prisma.productVariant.upsert({
    where: { sku: chipsSku },
    update: {
      productId: product2.id,
      sizeId: size2.id,
      typeId: productType2.id,
      price: 3.25,
      stock: 25,
      currency: "SAR",
    },
    create: {
      productId: product2.id,
      sizeId: size2.id,
      typeId: productType2.id,
      price: 3.25,
      stock: 25,
      sku: chipsSku,
      currency: "SAR",
    },
  });

  // ---- Coupons ----
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      title: "Welcome discount",
      titleI18n: { en: "Welcome discount", ar: "خصم ترحيبي" },
      couponType: "general",
      discountType: "PERCENTAGE",
      discount: 10,
      startDate: new Date(),
      endDate: nowPlusMinutes(60 * 24 * 30),
      minimumAmount: 1,
      maximumDiscount: 5,
      status: 1,
      description: "Seed coupon",
      descriptionI18n: { en: "Seed coupon", ar: "كوبون تجريبي" },
    },
  });

  // ---- Guest + Order flow ----
  const guest = await findOrCreate(
    prisma.guestCustomer,
    { phone: "+9647000000001" },
    { name: "Guest", phone: "+9647000000001" },
  );

  const order = await prisma.productOrder.create({
    data: {
      guestId: guest.id,
      driverId: driver.id,
      status: "ACCEPTED",
      paymentMethod: "CASH",
      dropoffLat: 33.31,
      dropoffLng: 44.36,
      dropoffNotes: "Seed dropoff",
      subtotal: 1.5,
      commissionPct: 0.1,
      commissionAmt: 0.15,
      total: 1.65,
      currency: "SAR",
      assignedAt: new Date(),
    },
  });

  await prisma.productOrderItem.create({
    data: {
      orderId: order.id,
      variantId: variant.id,
      quantity: 1,
      unitPrice: 1.5,
      lineTotal: 1.5,
    },
  });

  await prisma.productOrderOffer.create({
    data: {
      orderId: order.id,
      driverId: driver.id,
      offeredPrice: 1.65,
      status: "ACCEPTED",
    },
  });

  await prisma.productOrderLocationUpdate.createMany({
    data: [
      { orderId: order.id, driverId: driver.id, lat: 33.311, lng: 44.361, heading: 90, speed: 10 },
      { orderId: order.id, driverId: driver.id, lat: 33.312, lng: 44.362, heading: 92, speed: 12 },
      { orderId: order.id, driverId: driver.id, lat: 33.313, lng: 44.363, heading: 95, speed: 9 },
      { orderId: order.id, driverId: driver.id, lat: 33.314, lng: 44.364, heading: 97, speed: 11 }
    ],
  });

  await prisma.payment.create({
    data: {
      ProductOrderId: order.id,
      userId: rider.id,
      driverId: driver.id,
      amount: 1.65,
      paymentType: "cash",
      paymentStatus: "paid",
    },
  });

  await prisma.driverInventoryItem.upsert({
    where: { driverId_variantId: { driverId: driver.id, variantId: variant.id } },
    update: { quantityOnHand: 5, price: 1.5 },
    create: {
      driverId: driver.id,
      variantId: variant.id,
      quantityOnHand: 5,
      price: 1.5,
      currency: "SAR",
    },
  });

  await prisma.inventoryLog.create({
    data: {
      driverId: driver.id,
      variantId: variant.id,
      change: -1,
      reason: "Seed: order delivery",
    },
  });

  const driverWallet = await prisma.wallet.findUnique({ where: { userId: driver.id } });
  if (driverWallet) {
    await prisma.walletHistory.create({
      data: {
        walletId: driverWallet.id,
        userId: driver.id,
        ProductOrderId: order.id,
        type: "credit",
        amount: 1.65,
        balance: driverWallet.balance,
        description: "Seed: order payout",
        transactionType: "order",
      },
    });
  }

  // ---- Notifications ----
  await prisma.pushNotification.create({
    data: {
      title: "Seed push",
      titleI18n: { en: "Seed push", ar: "إشعار تجريبي" },
      message: "Hello from seed",
      messageI18n: { en: "Hello from seed", ar: "مرحباً من البيانات التجريبية" },
      forRider: true,
      forDriver: true,
    },
  });

  await prisma.notification.create({
    data: {
      type: "seed",
      notifiableType: "User",
      notifiableId: rider.id,
      data: { title: "Seed notification", body: "Hello" },
      isRead: false,
    },
  });

  // ---- Settings/audit ----
  await prisma.sos.create({
    data: { userId: rider.id, name: "Emergency", contactNumber: "+9647000000002", status: 1 },
  });

  await prisma.securityAuditLog.create({
    data: {
      category: "seed",
      userId: admin.id,
      userType: "admin",
      ip: "127.0.0.1",
      method: "POST",
      route: "/seed",
      requestId: "seed-req-1",
      statusCode: 200,
      metadata: { ok: true },
    },
  });

  // ---- Support + pages ----
  const support = await prisma.customerSupport.create({
    data: {
      userId: rider.id,
      message: "Seed support ticket",
      supportType: "general",
      status: "pending",
    },
  });

  await prisma.supportChathistory.create({
    data: { supportId: support.id, message: "Seed message", senderType: "user" },
  });

  await prisma.pages.upsert({
    where: { slug: "about" },
    update: { status: 1 },
    create: {
      slug: "about",
      title: "About",
      titleI18n: { en: "About", ar: "عن التطبيق" },
      description: "Seed about page",
      descriptionI18n: { en: "Seed about page", ar: "صفحة تعريف تجريبية" },
      status: 1,
    },
  });

  // ---- Admin login tracking ----
  await prisma.adminLoginDevice.create({
    data: {
      userId: admin.id,
      ipAddress: "127.0.0.1",
      userAgent: "seed",
      loginAt: new Date(),
      isActive: true,
      sessionId: "seed-session-1",
    },
  });

  await prisma.adminLoginHistory.create({
    data: {
      userId: admin.id,
      ipAddress: "127.0.0.1",
      city: "Seed City",
      country: "Seed",
      timezone: "UTC",
    },
  });

  // ---- Booking stubs (no Booking model in schema) ----
  await prisma.bookingInvoice.upsert({
    where: { bookingId: 1 },
    update: {},
    create: {
      bookingId: 1,
      subtotal: 10,
      tax: 0,
      discount: 0,
      total: 10,
      issuedAt: new Date(),
    },
  });

  await prisma.bookingLocationUpdate.create({
    data: { bookingId: 1, lat: 33.3, lng: 44.3 },
  });

  // ---- Withdraw ----
  await prisma.withdrawRequest.create({
    data: { userId: driver.id, amount: 5, currency: "USD", status: 0 },
  });

  // ---- Ride request stubs (no RideRequest model in schema) ----
  await prisma.rideRequestBid.create({
    data: { rideRequestId: 1, driverId: driver.id, bidAmount: 3.5, notes: "Seed bid" },
  });

  await prisma.rideRequestRating.create({
    data: {
      rideRequestId: 1,
      riderId: rider.id,
      driverId: driver.id,
      rating: 5,
      comment: "Seed rating",
      ratingBy: "rider",
    },
  });

  await prisma.rideRequestHistory.create({
    data: { rideRequestId: 1, historyType: "CREATED", datetime: new Date() },
  });

  // ---- Review + complaint ----
  await prisma.review.create({
    data: {
      driverId: driver.id,
      riderId: rider.id,
      rideRequestId: 1,
      driverRating: 5,
      riderRating: 5,
      driverReview: "Seed driver review",
      riderReview: "Seed rider review",
    },
  });

  await prisma.complaint.create({
    data: { driverId: driver.id, riderId: rider.id, message: "Seed complaint", status: "pending" },
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

