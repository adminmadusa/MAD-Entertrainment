"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validations_1 = require("@mad/validations");
const express_1 = require("express");
const artist_controller_1 = require("../../controllers/admin/artist.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAdmin);
router.get('/', artist_controller_1.listArtists);
router.post('/', (0, validate_middleware_1.validate)(validations_1.createArtistSchema), artist_controller_1.createArtist);
router.get('/:id', artist_controller_1.getArtist);
router.put('/:id', (0, validate_middleware_1.validate)(validations_1.updateArtistSchema), artist_controller_1.updateArtist);
router.delete('/:id', artist_controller_1.deleteArtist);
exports.default = router;
//# sourceMappingURL=artist.routes.js.map