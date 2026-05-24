"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const popup_controller_1 = require("../../controllers/public/popup.controller");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const router = (0, express_1.Router)();
router.get('/active', (0, cache_middleware_1.cdnCache)(60, 300), popup_controller_1.getActivePopups);
exports.default = router;
//# sourceMappingURL=popup.routes.js.map