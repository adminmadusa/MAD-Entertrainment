"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const popup_controller_1 = require("../../controllers/admin/popup.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', popup_controller_1.listPopups);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createPopupSchema), popup_controller_1.createPopup);
router.get('/:id', popup_controller_1.getPopup);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updatePopupSchema), popup_controller_1.updatePopup);
router.delete('/:id', popup_controller_1.deletePopup);
router.patch('/:id/toggle', popup_controller_1.togglePopup);
exports.default = router;
//# sourceMappingURL=popup.routes.js.map