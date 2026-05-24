"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const artist_controller_1 = require("../../controllers/public/artist.controller");
const router = (0, express_1.Router)();
router.get('/', artist_controller_1.listPublicArtists);
router.get('/:slug', artist_controller_1.getPublicArtistBySlug);
exports.default = router;
//# sourceMappingURL=artist.routes.js.map