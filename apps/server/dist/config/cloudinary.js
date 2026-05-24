"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = void 0;
exports.initCloudinary = initCloudinary;
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.getBlurDataUrl = getBlurDataUrl;
exports.buildCloudinaryUrl = buildCloudinaryUrl;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const logger_1 = require("../utils/logger");
function initCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        logger_1.logger.warn('⚠️  Cloudinary credentials missing — media uploads will be disabled');
        return;
    }
    cloudinary_1.v2.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    logger_1.logger.info('✅ Cloudinary initialized');
}
async function uploadToCloudinary(file, options = {}) {
    const result = await cloudinary_1.v2.uploader.upload(typeof file === 'string' ? file : `data:image/webp;base64,${file.toString('base64')}`, {
        folder: options.folder ?? 'mad-entertrainment',
        tags: options.tags ?? [],
        public_id: options.publicId,
        transformation: options.transformation ?? [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
        ],
        resource_type: 'image',
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
    };
}
async function deleteFromCloudinary(publicId) {
    await cloudinary_1.v2.uploader.destroy(publicId);
}
/**
 * Generate a blur placeholder data URL for an image
 */
function getBlurDataUrl(publicId, cloudName) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_10,q_10,e_blur:1000/${publicId}.webp`;
}
/**
 * Build an optimized Cloudinary URL with transformations
 */
function buildCloudinaryUrl(publicId, cloudName, options = {}) {
    const { width, height, quality = 'auto:good', format = 'auto', crop = 'fill' } = options;
    const transformations = [
        quality ? `q_${quality}` : '',
        format ? `f_${format}` : '',
        width ? `w_${width}` : '',
        height ? `h_${height}` : '',
        crop && (width || height) ? `c_${crop}` : '',
    ]
        .filter(Boolean)
        .join(',');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}
//# sourceMappingURL=cloudinary.js.map