import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import { generateAuthTokens } from "../../core/utils/jwtHelper.js";
import { storeDriverImage } from "../drivers-me/drivers-me-media.service.js";
import { formatFullPhone, parseCountryCode, parsePhone } from "../auth/auth.service.js";
import {
  DOC_STATUS,
  DRIVER_DOCUMENT_TYPES,
  DRIVER_DOCUMENT_TYPE_KEYS,
  DRIVER_STATUS,
} from "./driver-onboarding.constants.js";

function httpError(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

/**
 * Upserts the captain document catalog and returns `{ [type]: Document }`.
 */
export async function ensureDriverDocumentTypes(db = prisma) {
  const byType = {};
  for (const def of DRIVER_DOCUMENT_TYPES) {
    const types = [def.type, ...(def.aliases || [])];
    let row = await db.document.findFirst({ where: { type: { in: types } }, orderBy: { id: "asc" } });
    const data = {
      name: def.name,
      nameAr: def.nameAr,
      nameI18n: { en: def.name, ar: def.nameAr },
      type: def.type,
      isRequired: def.isRequired,
      hasExpiryDate: Boolean(def.hasExpiryDate),
      status: 1,
    };
    row = row
      ? await db.document.update({ where: { id: row.id }, data })
      : await db.document.create({ data });
    byType[def.type] = row;
  }
  return byType;
}

/** @param {Record<string, Array<{buffer: Buffer; mimetype: string; originalname?: string}>>|undefined} files */
async function storeUploadedDocuments(files) {
  const urls = {};
  for (const key of [...DRIVER_DOCUMENT_TYPE_KEYS, "car_image"]) {
    const file = files?.[key]?.[0];
    if (!file) continue;
    const { url } = await storeDriverImage(file);
    urls[key] = url;
  }
  return urls;
}

function serializeDocument(dd) {
  return {
    id: dd.id,
    documentId: dd.documentId,
    type: dd.document?.type ?? null,
    name: dd.document?.name ?? null,
    nameAr: dd.document?.nameAr ?? null,
    isRequired: Boolean(dd.document?.isRequired),
    status: dd.status,
    isVerified: dd.isVerified,
    rejectionReason: dd.rejectionReason,
    image: dd.documentImage,
    expireDate: dd.expireDate,
    updatedAt: dd.updatedAt,
  };
}

/**
 * Public multipart signup for captains. Account starts as `pending` until an admin approves it.
 */
export async function registerDriver(body, files) {
  const name = String(body?.name ?? "").trim();
  const password = String(body?.password ?? "");
  const email = body?.email ? String(body.email).trim().toLowerCase() : null;
  const phone = parsePhone(body?.phone);
  if (!name) throw httpError("name required");
  if (phone == null) throw httpError("valid phone required");
  if (password.length < 8) throw httpError("password must be at least 8 characters");

  const missing = DRIVER_DOCUMENT_TYPES.filter((d) => d.isRequired && !files?.[d.type]?.[0]).map(
    (d) => d.type,
  );
  if (missing.length) throw httpError(`missing required documents: ${missing.join(", ")}`);

  const exists = await prisma.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
    select: { id: true },
  });
  if (exists) throw httpError("email or phone already exists", 409);

  const docTypes = await ensureDriverDocumentTypes();
  const urls = await storeUploadedDocuments(files);
  const hashed = await bcrypt.hash(password, 10);
  const year = Number(body?.carProductionYear);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        phone,
        countryCode: parseCountryCode(body?.phone),
        password: hashed,
        userType: "driver",
        status: DRIVER_STATUS.PENDING,
        isVerified: false,
      },
    });
    await tx.wallet.create({ data: { userId: created.id, balance: 0, currency: "IQD" } });
    await tx.userDetail.create({
      data: {
        userId: created.id,
        carModel: body?.carModel ? String(body.carModel).trim() : null,
        carColor: body?.carColor ? String(body.carColor).trim() : null,
        carPlateNumber: body?.carPlateNumber ? String(body.carPlateNumber).trim() : null,
        carProductionYear: Number.isFinite(year) && year > 1900 ? year : null,
        carImage: urls.car_image ?? null,
      },
    });
    for (const type of DRIVER_DOCUMENT_TYPE_KEYS) {
      if (!urls[type]) continue;
      await tx.driverDocument.create({
        data: {
          driverId: created.id,
          documentId: docTypes[type].id,
          documentImage: urls[type],
          status: DOC_STATUS.PENDING,
        },
      });
    }
    return created;
  });

  const { accessToken, refreshToken } = generateAuthTokens(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: formatFullPhone(user.countryCode, user.phone),
      userType: user.userType,
      status: user.status,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
}

export async function getOnboarding(driverId) {
  const docTypes = await ensureDriverDocumentTypes();
  const user = await prisma.user.findUnique({
    where: { id: Number(driverId) },
    select: {
      id: true,
      name: true,
      status: true,
      isVerified: true,
      rejectionReason: true,
      lastRejectionAt: true,
      detail: true,
      driverDocuments: { include: { document: true }, orderBy: { id: "desc" } },
    },
  });
  if (!user) throw httpError("not found", 404);

  const latestByType = {};
  for (const dd of user.driverDocuments) {
    const type = dd.document?.type;
    if (type && !latestByType[type]) latestByType[type] = dd;
  }
  const documents = DRIVER_DOCUMENT_TYPES.map((def) => {
    const dd = latestByType[def.type];
    if (dd) return serializeDocument(dd);
    return {
      id: null,
      documentId: docTypes[def.type].id,
      type: def.type,
      name: def.name,
      nameAr: def.nameAr,
      isRequired: def.isRequired,
      status: "missing",
      isVerified: false,
      rejectionReason: null,
      image: null,
    };
  });

  return {
    status: user.status,
    isVerified: user.isVerified,
    rejectionReason: user.rejectionReason,
    lastRejectionAt: user.lastRejectionAt,
    vehicle: user.detail,
    documents,
  };
}

/**
 * Re-upload rejected / missing documents; puts the account back in the review queue.
 */
export async function resubmitDocuments(driverId, files) {
  const id = Number(driverId);
  const user = await prisma.user.findUnique({ where: { id }, select: { status: true } });
  if (!user) throw httpError("not found", 404);
  if (user.status === DRIVER_STATUS.ACTIVE) throw httpError("account already approved", 409);

  const docTypes = await ensureDriverDocumentTypes();
  const urls = await storeUploadedDocuments(files);
  const uploaded = DRIVER_DOCUMENT_TYPE_KEYS.filter((k) => urls[k]);
  if (!uploaded.length && !urls.car_image) throw httpError("no documents uploaded");

  await prisma.$transaction(async (tx) => {
    for (const type of uploaded) {
      const documentId = docTypes[type].id;
      const existing = await tx.driverDocument.findFirst({
        where: { driverId: id, documentId },
        orderBy: { id: "desc" },
      });
      const data = {
        documentImage: urls[type],
        status: DOC_STATUS.PENDING,
        isVerified: false,
        rejectionReason: null,
      };
      if (existing) {
        await tx.driverDocument.update({ where: { id: existing.id }, data });
      } else {
        await tx.driverDocument.create({ data: { ...data, driverId: id, documentId } });
      }
    }
    if (urls.car_image) {
      await tx.userDetail.upsert({
        where: { userId: id },
        create: { userId: id, carImage: urls.car_image },
        update: { carImage: urls.car_image },
      });
    }
    await tx.user.update({
      where: { id },
      data: { status: DRIVER_STATUS.PENDING, rejectionReason: null },
    });
  });

  return getOnboarding(id);
}

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------

const ADMIN_DRIVER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  countryCode: true,
  avatar: true,
  status: true,
  isVerified: true,
  rejectionReason: true,
  lastRejectionAt: true,
  createdAt: true,
};

export async function listDriversForReview({ status = DRIVER_STATUS.PENDING, search, page = 1, limit = 20 } = {}) {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  const where = { userType: "driver" };
  if (status && status !== "all") where.status = status;
  const q = String(search ?? "").trim();
  if (q) {
    const asNumber = parsePhone(q);
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      ...(asNumber != null ? [{ phone: asNumber }] : []),
    ];
  }

  const [rows, total, pending, rejected, active] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...ADMIN_DRIVER_SELECT, _count: { select: { driverDocuments: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { userType: "driver", status: DRIVER_STATUS.PENDING } }),
    prisma.user.count({ where: { userType: "driver", status: DRIVER_STATUS.REJECTED } }),
    prisma.user.count({ where: { userType: "driver", status: DRIVER_STATUS.ACTIVE } }),
  ]);

  return {
    items: rows.map(({ _count, ...u }) => ({
      ...u,
      phone: formatFullPhone(u.countryCode, u.phone),
      documentsCount: _count.driverDocuments,
    })),
    total,
    page: Math.max(1, Number(page) || 1),
    limit: take,
    counts: { pending, rejected, active },
  };
}

export async function pendingCount() {
  const pending = await prisma.user.count({
    where: { userType: "driver", status: DRIVER_STATUS.PENDING },
  });
  return { pending };
}

export async function getDriverReview(driverId) {
  const user = await prisma.user.findFirst({
    where: { id: Number(driverId), userType: "driver" },
    select: ADMIN_DRIVER_SELECT,
  });
  if (!user) throw httpError("driver not found", 404);
  const onboarding = await getOnboarding(user.id);
  return {
    driver: { ...user, phone: formatFullPhone(user.countryCode, user.phone) },
    vehicle: onboarding.vehicle,
    documents: onboarding.documents,
  };
}

async function notifyDriver(driverId, type, title, body) {
  try {
    await prisma.notification.create({
      data: {
        type,
        notifiableType: "User",
        notifiableId: Number(driverId),
        data: { title, body },
        isRead: false,
      },
    });
  } catch {
    /* best-effort */
  }
}

export async function approveDriver(driverId) {
  const id = Number(driverId);
  const user = await prisma.user.findFirst({ where: { id, userType: "driver" }, select: { id: true } });
  if (!user) throw httpError("driver not found", 404);

  await prisma.$transaction([
    prisma.driverDocument.updateMany({
      where: { driverId: id, status: { not: DOC_STATUS.REJECTED } },
      data: { status: DOC_STATUS.APPROVED, isVerified: true, rejectionReason: null },
    }),
    prisma.user.update({
      where: { id },
      data: { status: DRIVER_STATUS.ACTIVE, isVerified: true, rejectionReason: null },
    }),
  ]);

  await notifyDriver(
    id,
    "driver_approved",
    "تم قبول حسابك كقائد",
    "مبروك! تمت الموافقة على حسابك ويمكنك الآن استقبال الطلبات.",
  );
  return getDriverReview(id);
}

export async function rejectDriver(driverId, { reason, documentIds } = {}) {
  const id = Number(driverId);
  const text = String(reason ?? "").trim();
  if (!text) throw httpError("reason required");
  const user = await prisma.user.findFirst({ where: { id, userType: "driver" }, select: { id: true } });
  if (!user) throw httpError("driver not found", 404);

  const ids = Array.isArray(documentIds) ? documentIds.map(Number).filter(Number.isFinite) : [];
  await prisma.$transaction([
    ...(ids.length
      ? [
          prisma.driverDocument.updateMany({
            where: { driverId: id, id: { in: ids } },
            data: { status: DOC_STATUS.REJECTED, isVerified: false, rejectionReason: text },
          }),
        ]
      : []),
    prisma.user.update({
      where: { id },
      data: {
        status: DRIVER_STATUS.REJECTED,
        isVerified: false,
        isOnline: false,
        isAvailable: false,
        rejectionReason: text,
        lastRejectionAt: new Date(),
        driverRejectionCount: { increment: 1 },
      },
    }),
  ]);

  await notifyDriver(id, "driver_rejected", "تحتاج بيانات حسابك إلى تعديل", text);
  return getDriverReview(id);
}

/** Per-document decision from the review drawer. */
export async function reviewDocument(driverId, documentRowId, { status, reason } = {}) {
  if (![DOC_STATUS.APPROVED, DOC_STATUS.REJECTED].includes(status)) throw httpError("invalid status");
  const row = await prisma.driverDocument.findFirst({
    where: { id: Number(documentRowId), driverId: Number(driverId) },
  });
  if (!row) throw httpError("document not found", 404);
  await prisma.driverDocument.update({
    where: { id: row.id },
    data: {
      status,
      isVerified: status === DOC_STATUS.APPROVED,
      rejectionReason: status === DOC_STATUS.REJECTED ? String(reason ?? "").trim() || null : null,
    },
  });
  return getDriverReview(driverId);
}
