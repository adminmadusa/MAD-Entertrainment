"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const popup_controller_1 = require("../../controllers/public/popup.controller");
const router = (0, express_1.Router)();
// Returns currently active, date-valid popup campaigns sorted by priority
router.get('/active', popup_controller_1.getActivePopups);
exports.default = router;
//# sourceMappingURL=popup.routes.js.map