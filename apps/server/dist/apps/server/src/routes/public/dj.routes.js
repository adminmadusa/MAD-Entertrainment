"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dj_controller_1 = require("../../controllers/public/dj.controller");
const router = (0, express_1.Router)();
router.get('/', dj_controller_1.listPublicDJs);
exports.default = router;
//# sourceMappingURL=dj.routes.js.map