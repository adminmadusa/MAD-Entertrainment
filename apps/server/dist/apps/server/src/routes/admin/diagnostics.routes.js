"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const diagnostics_controller_1 = require("../../controllers/admin/diagnostics.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/consistency', diagnostics_controller_1.getConsistencyDiagnostics);
router.post('/consistency/repair', diagnostics_controller_1.repairConsistency);
router.get('/reservations', diagnostics_controller_1.listReservations);
exports.default = router;
//# sourceMappingURL=diagnostics.routes.js.map