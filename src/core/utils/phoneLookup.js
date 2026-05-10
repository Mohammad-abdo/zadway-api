/**
 * Build possible contactNumber strings for DB lookup.
 * (Copy of legacy util, moved under src/core)
 */
export function contactNumberLookupVariants(input) {
  if (input == null || input === "") return [];
  const trimmed = String(input).trim();
  const set = new Set([trimmed]);
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return [...set];

  set.add(digits);

  // Egypt (+20): DB often has 01XXXXXXXXX; app may send +201XXXXXXXXX
  if (digits.startsWith("20") && digits.length >= 12) {
    const rest = digits.slice(2);
    set.add(rest);
    set.add("0" + rest);
    set.add("+20" + rest);
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    set.add("20" + digits.slice(1));
    set.add("+20" + digits.slice(1));
    // Some rows store national digits without leading 0 (e.g. 1000000002)
    set.add(digits.slice(1));
  }
  // Match 10XXXXXXXXX → 0XXXXXXXXXX
  if (!digits.startsWith("0") && digits.length === 10 && digits.startsWith("1")) {
    set.add("0" + digits);
  }

  return [...set].filter(Boolean);
}

/**
 * Mobile rider/driver login accepts only the registered phone (`phone`) + `password`.
 */
export function mobileLoginPhoneOnlyPolicyError(body) {
  const phoneRaw = body?.phone;
  const emailRaw = body?.email;
  const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : "";
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";

  if (email && !phone) {
    return {
      status: 400,
      messageKey: "auth.mobile_login_phone_required",
    };
  }
  if (phone.includes("@")) {
    return {
      status: 400,
      messageKey: "auth.mobile_login_phone_not_email",
    };
  }
  return null;
}

