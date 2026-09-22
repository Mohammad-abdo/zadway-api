import fs from "fs/promises";
import path from "path";
import * as service from "./auth.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import { allocateSequentialFilename } from "../../core/upload/allocateSequentialFile.js";
import { ensureUploadDirs } from "../../core/upload/mediaPaths.js";

export async function login(req, res) {
  try {
    const result = await service.login(req.body);
    return successResponse(res, result, t("auth.logged_in", req.locale));
  } catch (e) {
    const code = e.statusCode || 401;
    return errorResponse(res, t("auth.invalid_credentials", req.locale), code);
  }
}

export async function register(req, res) {
  try {
    const result = await service.register(req.body);
    return successResponse(res, result, t("auth.registered", req.locale), 201);
  } catch (e) {
    const code = e.statusCode || 400;
    return errorResponse(res, e.message || t("common.error", req.locale), code);
  }
}

export async function me(req, res) {
  try {
    const user = await service.me(req.user.id);
    return successResponse(res, user, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function updateMe(req, res) {
  try {
    const user = await service.updateMe(req.user.id, req.body);
    return successResponse(res, user, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message || t("common.error", req.locale), e.statusCode || 400);
  }
}

export async function changePassword(req, res) {
  try {
    const result = await service.changePassword(req.user.id, req.body);
    return successResponse(res, result, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message || t("common.error", req.locale), e.statusCode || 400);
  }
}

export async function uploadAvatar(req, res) {
  const locale = req.locale ?? "ar";
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      return errorResponse(res, "لم يتم إرسال ملف", 400);
    }
    const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.mimetype];
    if (!ext) return errorResponse(res, "نوع الملف غير مدعوم", 415);

    ensureUploadDirs();
    const { absolutePath, publicUrl } = allocateSequentialFilename("image", ext);
    await fs.writeFile(absolutePath, file.buffer);

    // Update user's avatar in DB
    const user = await service.updateMe(req.user.id, { avatar: publicUrl });
    return successResponse(res, { url: publicUrl, user }, t("common.success", locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function publicRegister(req, res) {
  try {
    const result = await service.publicRegister(req.body);
    return successResponse(res, result, t("auth.registered", req.locale), 201);
  } catch (e) {
    const code = e.statusCode || 400;
    return errorResponse(res, e.message || t("common.error", req.locale), code);
  }
}
