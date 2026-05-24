"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../../controllers/admin/upload.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All upload routes require admin auth
router.use(auth_middleware_1.requireAdmin);
/** GET /api/admin/uploads/signature?folder=events */
router.get('/signature', upload_controller_1.getUploadSignature);
/** DELETE /api/admin/uploads — body: { publicId } */
router.delete('/', upload_controller_1.deleteUpload);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map