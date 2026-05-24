"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const dj_controller_1 = require("../../controllers/admin/dj.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', dj_controller_1.listDJs);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createDJSchema), dj_controller_1.createDJ);
router.get('/:id', dj_controller_1.getDJ);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updateDJSchema), dj_controller_1.updateDJ);
router.delete('/:id', dj_controller_1.deleteDJ);
exports.default = router;
//# sourceMappingURL=dj.routes.js.map