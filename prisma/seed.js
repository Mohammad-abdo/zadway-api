import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Unsplash CDN — stable water / packaging photos for catalog & seed docs */
const SEED_IMAGES = {
  categoryWater:
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80",
  productHero:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1200&q=80",
  productGallery: [
    "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=1200&q=80",
    "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=1200&q=80",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=80",
  ],
  driverLicenseSample:
    "https://images.unsplash.com/photo-1449965408869-eaa3aaf487df?w=800&q=80",
  /** Per-size hero + galleries (distinct visuals for client variant picker). */
  waterVariantSmallHero:
    "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=1200&q=80",
  waterVariantSmallGallery: [
    "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=1200&q=80",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=80",
  ],
  waterVariantMediumHero:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1200&q=80",
  waterVariantMediumGallery: [
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80",
    "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=1200&q=80",
  ],
  waterVariantLargeHero:
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=80",
  waterVariantLargeGallery: [
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1200&q=80",
    "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=1200&q=80",
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80",
  ],
};

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

/** Drop legacy seed products so re-seed keeps a single water catalog (best-effort). */
async function removeLegacyCatalogProducts(names) {
  for (const name of names) {
    const p = await prisma.product.findFirst({ where: { name } });
    if (!p) continue;
    await prisma.banner.deleteMany({ where: { productId: p.id } });
    const variants = await prisma.productVariant.findMany({ where: { productId: p.id } });
    for (const v of variants) {
      await prisma.driverInventoryItem.deleteMany({ where: { variantId: v.id } });
      await prisma.inventoryLog.deleteMany({ where: { variantId: v.id } });
      await prisma.productOrderItem.deleteMany({ where: { variantId: v.id } });
    }
    await prisma.productVariant.deleteMany({ where: { productId: p.id } });
    await prisma.product.delete({ where: { id: p.id } });
  }
  const snacks = await prisma.category.findFirst({ where: { name: "Snacks" } });
  if (snacks) {
    const cnt = await prisma.product.count({ where: { categoryId: snacks.id } });
    if (cnt === 0) await prisma.category.delete({ where: { id: snacks.id } });
  }
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

  const driverDefs = [
    { email: "driver@qarora.com", name: "Ali Al-Qahtani", lat: "33.3152", lng: "44.3661", plate: "RIY-1001", car: "Toyota Hiace" },
    { email: "driver2@qarora.local", name: "Omar Al-Mutairi", lat: "33.3180", lng: "44.3685", plate: "JED-2204", car: "Hyundai H1" },
    { email: "driver3@qarora.local", name: "Khalid Al-Dosari", lat: "33.3105", lng: "44.3590", plate: "DMM-3308", car: "Ford Transit" },
    { email: "driver4@qarora.local", name: "Faisal Al-Harbi", lat: "33.3220", lng: "44.3710", plate: "RIY-4402", car: "Mercedes Sprinter" },
  ];
  const drivers = [];
  for (let i = 0; i < driverDefs.length; i += 1) {
    const d = driverDefs[i];
    const driverPhone = await pickFreePhone(1000000200 + i * 17, d.email);
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        status: "active",
        userType: "driver",
        isAvailable: true,
        name: d.name,
        latitude: d.lat,
        longitude: d.lng,
      },
      create: {
        name: d.name,
        email: d.email,
        password: SEED_PASSWORD,
        phone: driverPhone,
        userType: "driver",
        status: "active",
        isVerified: true,
        isAvailable: true,
        latitude: d.lat,
        longitude: d.lng,
      },
    });
    drivers.push({ user, ...d });
  }
  const driver = drivers[0].user;

  const riderDefs = [
    { email: "customer@qarora.local", name: "Sara Al-Rashid", lat: "33.3128", lng: "44.3615" },
    { email: "client2@qarora.local", name: "Noura Al-Zahrani", lat: "33.3140", lng: "44.3625" },
    { email: "client3@qarora.local", name: "Layla Al-Otaibi", lat: "33.3110", lng: "44.3600" },
  ];
  const riders = [];
  for (let i = 0; i < riderDefs.length; i += 1) {
    const r = riderDefs[i];
    const riderPhone = await pickFreePhone(1000000500 + i * 19, r.email);
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: { status: "active", userType: "rider", name: r.name, latitude: r.lat, longitude: r.lng },
      create: {
        name: r.name,
        email: r.email,
        password: SEED_PASSWORD,
        phone: riderPhone,
        userType: "rider",
        status: "active",
        isVerified: true,
        latitude: r.lat,
        longitude: r.lng,
      },
    });
    riders.push({ user, ...r });
  }
  const rider = riders[0].user;

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
  const opsEmail = "ops@qarora.local";
  const careEmail = "care@qarora.local";
  const managerPhone = await pickFreePhone(1000000901, managerEmail);
  const editorPhone = await pickFreePhone(1000000902, editorEmail);
  const opsPhone = await pickFreePhone(1000000903, opsEmail);
  const carePhone = await pickFreePhone(1000000904, careEmail);
  const managerUser = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { userType: "staff", status: "active", password: SEED_PASSWORD, name: "Operations Manager" },
    create: {
      name: "Operations Manager",
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
    update: { userType: "staff", status: "active", password: SEED_PASSWORD, name: "Content Editor" },
    create: {
      name: "Content Editor",
      email: editorEmail,
      password: SEED_PASSWORD,
      phone: editorPhone,
      userType: "staff",
      status: "active",
      isVerified: true,
    },
  });
  const opsUser = await prisma.user.upsert({
    where: { email: opsEmail },
    update: { userType: "staff", status: "active", password: SEED_PASSWORD, name: "Logistics Ops" },
    create: {
      name: "Logistics Ops",
      email: opsEmail,
      password: SEED_PASSWORD,
      phone: opsPhone,
      userType: "staff",
      status: "active",
      isVerified: true,
    },
  });
  const careUser = await prisma.user.upsert({
    where: { email: careEmail },
    update: { userType: "staff", status: "active", password: SEED_PASSWORD, name: "Customer Care" },
    create: {
      name: "Customer Care",
      email: careEmail,
      password: SEED_PASSWORD,
      phone: carePhone,
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
      { userId: opsUser.id, roleId: roleManager.id },
      { userId: careUser.id, roleId: roleEditor.id },
      ...drivers.slice(1).map((d) => ({ userId: d.user.id, roleId: roleDriver.id })),
      ...riders.slice(1).map((r) => ({ userId: r.user.id, roleId: roleRider.id })),
    ],
    skipDuplicates: true,
  });

  // ---- Wallets ----
  const walletUsers = [
    { userId: admin.id, balance: 0 },
    { userId: driver.id, balance: 50 },
    { userId: rider.id, balance: 25 },
    { userId: managerUser.id, balance: 0 },
    { userId: editorUser.id, balance: 0 },
    { userId: opsUser.id, balance: 0 },
    { userId: careUser.id, balance: 0 },
    ...drivers.slice(1).map((d) => ({ userId: d.user.id, balance: 40 })),
    ...riders.slice(1).map((r) => ({ userId: r.user.id, balance: 20 })),
  ];
  for (const w of walletUsers) {
    await prisma.wallet.upsert({
      where: { userId: w.userId },
      update: { balance: w.balance },
      create: { userId: w.userId, balance: w.balance, currency: "SAR" },
    });
  }

  // ---- User details (driver car) ----
  for (const d of drivers) {
    await prisma.userDetail.upsert({
      where: { userId: d.user.id },
      update: {
        carModel: d.car,
        carPlateNumber: d.plate,
      },
      create: {
        userId: d.user.id,
        carModel: d.car,
        carColor: "White",
        carPlateNumber: d.plate,
        carProductionYear: 2022,
        workAddress: "Riyadh distribution hub",
        homeAddress: "Riyadh",
        workLatitude: d.lat,
        workLongitude: d.lng,
        homeLatitude: d.lat,
        homeLongitude: d.lng,
      },
    });
  }

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

  for (const d of drivers) {
    await findOrCreate(
      prisma.driverDocument,
      { driverId: d.user.id, documentId: docLicense.id },
      {
        driverId: d.user.id,
        documentId: docLicense.id,
        isVerified: true,
        documentImage: SEED_IMAGES.driverLicenseSample,
        expireDate: new Date(new Date().getFullYear() + 1, 0, 1),
      },
    );
  }

  // ---- Addresses / Cards ----
  for (let i = 0; i < riders.length; i += 1) {
    const ru = riders[i].user;
    await findOrCreate(
      prisma.userAddress,
      { userId: ru.id, title: "Home" },
      {
        userId: ru.id,
        title: "Home",
        address: `Riyadh — test address #${i + 1}`,
        latitude: riders[i].lat,
        longitude: riders[i].lng,
        isDefault: true,
      },
    );
    await findOrCreate(
      prisma.userBankCard,
      { userId: ru.id, lastFourDigits: `${4240 + i}` },
      {
        userId: ru.id,
        cardHolderName: ru.name || "Test Client",
        lastFourDigits: `${4240 + i}`.slice(-4),
        brand: "VISA",
        expiryMonth: 12,
        expiryYear: new Date().getFullYear() + 2,
        isDefault: true,
      },
    );
  }

  // ---- Catalog: one water product, three sizes, real images ----
  await removeLegacyCatalogProducts(["Seed Water", "Seed Chips", "Qarora Natural Drinking Water"]);

  const category = await findOrCreate(
    prisma.category,
    { name: "Drinking water" },
    {
      name: "Drinking water",
      nameI18n: { en: "Drinking water", ar: "مياه الشرب" },
      description: "Purified still bottled water — home & office delivery.",
      descriptionI18n: {
        en: "Purified still bottled water — home & office delivery.",
        ar: "مياه معبأة نقية للشرب — توصيل منزلي ومكتبي.",
      },
      image_url: SEED_IMAGES.categoryWater,
    },
  );

  const gallery = [SEED_IMAGES.productHero, ...SEED_IMAGES.productGallery];
  const product = await findOrCreate(
    prisma.product,
    { name: "Qarora Natural Drinking Water" },
    {
      name: "Qarora Natural Drinking Water",
      nameI18n: { en: "Qarora Natural Drinking Water", ar: "مياه قرورة الطبيعية" },
      description:
        "18.9L and single-serve options. Minerals balanced for daily hydration. Sealed caps, batch traceability, and cold-chain friendly storage.",
      descriptionI18n: {
        en: "18.9L and single-serve options. Minerals balanced for daily hydration. Sealed caps, batch traceability, and cold-chain friendly storage.",
        ar: "خيارات ١٨.٩ لتر وعبوات فردية. أملاغ متوازنة للترطيب اليومي. أغطية محكمة وتتبع دفعات وتخزين مناسب لسلسلة التبريد.",
      },
      categoryId: category.id,
      imageUrl: SEED_IMAGES.productHero,
      images: gallery,
      isActive: true,
    },
  );

  const sizeSmall = await prisma.size.upsert({
    where: { id: 1 },
    update: {
      name: "Small",
      nameAr: "صغير",
      nameI18n: { en: "Small (330 ml)", ar: "صغير (٣٣٠ مل)" },
    },
    create: {
      id: 1,
      name: "Small",
      nameAr: "صغير",
      nameI18n: { en: "Small (330 ml)", ar: "صغير (٣٣٠ مل)" },
    },
  });

  const sizeLarge = await prisma.size.upsert({
    where: { id: 2 },
    update: {
      name: "Large",
      nameAr: "كبير",
      nameI18n: { en: "Large (1.5 L)", ar: "كبير (١.٥ لتر)" },
    },
    create: {
      id: 2,
      name: "Large",
      nameAr: "كبير",
      nameI18n: { en: "Large (1.5 L)", ar: "كبير (١.٥ لتر)" },
    },
  });

  const sizeMedium = await prisma.size.upsert({
    where: { id: 3 },
    update: {
      name: "Medium",
      nameAr: "وسط",
      nameI18n: { en: "Medium (600 ml)", ar: "وسط (٦٠٠ مل)" },
    },
    create: {
      id: 3,
      name: "Medium",
      nameAr: "وسط",
      nameI18n: { en: "Medium (600 ml)", ar: "وسط (٦٠٠ مل)" },
    },
  });

  const productType = await prisma.productType.upsert({
    where: { id: 1 },
    update: {
      name: "Bottle",
      nameAr: "عبوة",
      nameI18n: { en: "PET bottle", ar: "عبوة بلاستيكية" },
    },
    create: {
      id: 1,
      name: "Bottle",
      nameAr: "عبوة",
      nameI18n: { en: "PET bottle", ar: "عبوة بلاستيكية" },
    },
  });

  const variantSmall = await prisma.productVariant.upsert({
    where: { sku: "SEED-QARORA-WATER-SMALL" },
    update: {
      productId: product.id,
      sizeId: sizeSmall.id,
      typeId: productType.id,
      price: 1.0,
      stock: 200,
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantSmallHero,
      images: SEED_IMAGES.waterVariantSmallGallery,
    },
    create: {
      productId: product.id,
      sizeId: sizeSmall.id,
      typeId: productType.id,
      price: 1.0,
      stock: 200,
      sku: "SEED-QARORA-WATER-SMALL",
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantSmallHero,
      images: SEED_IMAGES.waterVariantSmallGallery,
    },
  });

  const variantMedium = await prisma.productVariant.upsert({
    where: { sku: "SEED-QARORA-WATER-MEDIUM" },
    update: {
      productId: product.id,
      sizeId: sizeMedium.id,
      typeId: productType.id,
      price: 1.5,
      stock: 320,
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantMediumHero,
      images: SEED_IMAGES.waterVariantMediumGallery,
    },
    create: {
      productId: product.id,
      sizeId: sizeMedium.id,
      typeId: productType.id,
      price: 1.5,
      stock: 320,
      sku: "SEED-QARORA-WATER-MEDIUM",
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantMediumHero,
      images: SEED_IMAGES.waterVariantMediumGallery,
    },
  });

  const variantLarge = await prisma.productVariant.upsert({
    where: { sku: "SEED-QARORA-WATER-LARGE" },
    update: {
      productId: product.id,
      sizeId: sizeLarge.id,
      typeId: productType.id,
      price: 2.25,
      stock: 180,
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantLargeHero,
      images: SEED_IMAGES.waterVariantLargeGallery,
    },
    create: {
      productId: product.id,
      sizeId: sizeLarge.id,
      typeId: productType.id,
      price: 2.25,
      stock: 180,
      sku: "SEED-QARORA-WATER-LARGE",
      currency: "SAR",
      imageUrl: SEED_IMAGES.waterVariantLargeHero,
      images: SEED_IMAGES.waterVariantLargeGallery,
    },
  });

  /** Default variant for sample order / inventory logs (medium bottle). */
  const variant = variantMedium;

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

  const orderAccessToken = randomBytes(24).toString("hex");
  const order = await prisma.productOrder.create({
    data: {
      guestId: guest.id,
      riderUserId: rider.id,
      accessToken: orderAccessToken,
      driverId: driver.id,
      status: "ACCEPTED",
      paymentMethod: "CASH",
      dropoffLat: 33.31,
      dropoffLng: 44.36,
      dropoffNotes: "Sample order — medium bottle (seed)",
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

  const inventoryRows = [
    { driverIdx: 0, v: variantSmall, qty: 12, price: 1.0 },
    { driverIdx: 0, v: variantMedium, qty: 24, price: 1.5 },
    { driverIdx: 0, v: variantLarge, qty: 16, price: 2.25 },
    { driverIdx: 1, v: variantSmall, qty: 8, price: 1.0 },
    { driverIdx: 1, v: variantMedium, qty: 10, price: 1.5 },
    { driverIdx: 2, v: variantLarge, qty: 6, price: 2.25 },
    { driverIdx: 3, v: variantSmall, qty: 5, price: 1.0 },
    { driverIdx: 3, v: variantMedium, qty: 5, price: 1.5 },
    { driverIdx: 3, v: variantLarge, qty: 5, price: 2.25 },
  ];
  for (const row of inventoryRows) {
    const uid = drivers[row.driverIdx].user.id;
    await prisma.driverInventoryItem.upsert({
      where: { driverId_variantId: { driverId: uid, variantId: row.v.id } },
      update: { quantityOnHand: row.qty, price: row.price },
      create: {
        driverId: uid,
        variantId: row.v.id,
        quantityOnHand: row.qty,
        price: row.price,
        currency: "SAR",
      },
    });
  }

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
  console.log("");
  console.log("=== Qarora seed accounts (password: password, except admin) ===");
  console.log(`Admin:     ${ADMIN_EMAIL} / ${ADMIN_PASSWORD_PLAIN}`);
  console.log("Staff:     manager@qarora.local | editor@qarora.local | ops@qarora.local | care@qarora.local");
  console.log("Drivers:   driver@qarora.com | driver2@qarora.local | driver3@qarora.local | driver4@qarora.local");
  console.log("Clients:   customer@qarora.local | client2@qarora.local | client3@qarora.local");
  console.log("");
  console.log("Catalog: one product — Qarora Natural Drinking Water (S / M / L bottle variants).");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

