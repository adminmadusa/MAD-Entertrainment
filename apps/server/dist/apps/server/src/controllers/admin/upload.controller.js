"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadSignature = getUploadSignature;
exports.deleteUpload = deleteUpload;
const shared_1 = require("@mad/shared");
const cloudinary_1 = require("cloudinary");
const env_1 = require("../../config/env");
const response_1 = require("../../utils/response");
const ALLOWED_FOLDERS = ['events', 'venues', 'artists', 'dj-operators', 'popups'];
/**
 * GET /api/admin/uploads/signature?folder=events
 * Returns a short-lived Cloudinary signed upload signature.
 * The browser uses this to POST directly to Cloudinary — our server
 * never touches the file bytes.
 */
async function getUploadSignature(req, res) {
    const folder = req.query.folder ?? 'events';
    if (!ALLOWED_FOLDERS.includes(folder)) {
        (0, response_1.sendError)(res, `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}`, shared_1.HTTP_STATUS.BAD_REQUEST);
        return;
    }
    const env = (0, env_1.getEnv)();
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        folder: `mad-entertrainment/${folder}`,
        timestamp,
        transformation: 'q_auto,f_auto',
    };
    const signature = cloudinary_1.v2.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET ?? '');
    (0, response_1.sendSuccess)(res, {
        signature,
        timestamp,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        folder: paramsToSign.folder,
        transformation: paramsToSign.transformation,
    });
}
/**
 * DELETE /api/admin/uploads
 * Body: { publicId: string }
 * Deletes an image from Cloudinary by publicId.
 * Called when an event/venue/artist is deleted or image is replaced.
 */
async function deleteUpload(req, res) {
    const { publicId } = req.body;
    if (!publicId || typeof publicId !== 'string') {
        (0, response_1.sendError)(res, 'publicId is required', shared_1.HTTP_STATUS.BAD_REQUEST);
        return;
    }
    // Safety: only allow deleting from our own folder prefix
    if (!publicId.startsWith('mad-entertrainment/')) {
        (0, response_1.sendError)(res, 'Cannot delete assets outside mad-entertrainment folder', shared_1.HTTP_STATUS.FORBIDDEN);
        return;
    }
    await cloudinary_1.v2.uploader.destroy(publicId);
    (0, response_1.sendSuccess)(res, { publicId }, 'Image deleted from Cloudinary');
}
//# sourceMappingURL=upload.controller.js.map