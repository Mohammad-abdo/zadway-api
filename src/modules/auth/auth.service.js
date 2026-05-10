import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import { generateToken, generateAuthTokens } from "../../core/utils/jwtHelper.js";
import { getDashboardPermissionPayload } from "../../core/utils/staffPermissions.js";

function parsePhone(phone) {
  if (phone === undefined || phone === null || phone === "") return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // If input includes country code like +964..., strip it and keep local part for INT storage.
  let local = digits;
  if (raw.startsWith("+") && digits.length > 8) {
    local = digits.slice(3);
  }
  local = local.replace(/^0+/, "") || "0";

  // INT max guard.
  let n = parseInt(local, 10);
  if (Number.isNaN(n)) return null;
  if (n > 2147483647) {
    const shortened = local.slice(-9);
    n = parseInt(shortened, 10);
  }
  return Number.isNaN(n) ? null : n;
}

function parseCountryCode(phone) {
  if (phone === undefined || phone === null || phone === "") return "+1";
  const raw = String(phone).trim();
  if (!raw.startsWith("+")) return "+1";
  const m = raw.match(/^\+(\d{1,3})/);
  return m ? `+${m[1]}` : "+1";
}

function formatFullPhone(countryCode, phone) {
  if (phone === undefined || phone === null) return null;
  const cc = (countryCode && String(countryCode).trim()) || "+1";
  const p = String(phone).replace(/\D/g, "");
  return `${cc}${p}`;
}

export async function login({ email, phone, password }) {
  if (!password) {
    const e = new Error("password required");
    e.statusCode = 400;
    throw e;
  }
  let user = null;
  if (email) {
    user = await prisma.user.findUnique({ where: { email: String(email).trim() } });
  }
  const p = parsePhone(phone);
  if (!user && p != null) {
    user = await prisma.user.findUnique({ where: { phone: p } });
  }
  if (!user?.password) {
    const e = new Error("invalid credentials");
    e.statusCode = 401;
    throw e;
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const e = new Error("invalid credentials");
    e.statusCode = 401;
    throw e;
  }
  const { accessToken, refreshToken } = generateAuthTokens(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: formatFullPhone(user.countryCode, user.phone),
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
}

export async function register(body) {
  const { email, password, name, phone, userType } = body;
  if (!password) {
    const e = new Error("password required");
    e.statusCode = 400;
    throw e;
  }
  if (!email && phone == null) {
    const e = new Error("email or phone required");
    e.statusCode = 400;
    throw e;
  }
  const hashed = await bcrypt.hash(password, 10);
  const p = parsePhone(phone);
  const data = {
    email: email ? String(email).trim() : null,
    password: hashed,
    name: name ?? null,
    userType: userType ?? "rider",
    status: "active",
    phone: p,
  };
  const user = await prisma.user.create({ data });
  try {
    await prisma.wallet.create({ data: { userId: user.id, balance: 0, currency: "SAR" } });
  } catch {
    /* wallet may exist */
  }
  const token = generateToken(user.id);
  const { password: _pw, ...safe } = user;
  return { user: safe, token };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      userType: true,
      status: true,
      displayName: true,
      avatar: true,
      createdAt: true,
      wallet: true,
      detail: true,
      userRoles: { include: { role: true } },
    },
  });
  if (!user) return null;
  const payload = await getDashboardPermissionPayload(userId, user.userType);
  return {
    ...user,
    permissions: payload.permissionNames,
    isDashboardAdmin: payload.isDashboardAdmin,
  };
}

export async function publicRegister(body) {
  const { name, email, phone, role, avatar, password, paddword } = body;
  const plainPassword = password || paddword;
  const normalizedEmail = String(email).trim().toLowerCase();
  const p = parsePhone(phone);
  const countryCode = parseCountryCode(phone);

  if (!normalizedEmail) {
    const e = new Error("email required");
    e.statusCode = 400;
    throw e;
  }
  if (p == null) {
    const e = new Error("valid phone required");
    e.statusCode = 400;
    throw e;
  }
  if (!plainPassword) {
    const e = new Error("password required");
    e.statusCode = 400;
    throw e;
  }

  const exists = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: p }],
    },
    select: { id: true },
  });
  if (exists) {
    const e = new Error("email or phone already exists");
    e.statusCode = 409;
    throw e;
  }

  const userType = String(role || "USER").toLowerCase();
  const hashed = await bcrypt.hash(String(plainPassword), 10);
  const user = await prisma.user.create({
    data: {
      name: name ?? null,
      email: normalizedEmail,
      phone: p,
      countryCode,
      password: hashed,
      userType,
      status: "active",
      avatar: avatar ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      countryCode: true,
      avatar: true,
    },
  });

  try {
    await prisma.wallet.create({ data: { userId: user.id, balance: 0, currency: "SAR" } });
  } catch {
    /* wallet may exist */
  }

  const { accessToken, refreshToken } = generateAuthTokens(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: formatFullPhone(user.countryCode, user.phone),
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
}
