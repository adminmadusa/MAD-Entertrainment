"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicDJs = listPublicDJs;
const dj_service_1 = require("../../services/public/dj.service");
const response_1 = require("../../utils/response");
async function listPublicDJs(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search } = req.query;
    const { djs, total } = await dj_service_1.PublicDJService.listDJs({ search, page, limit });
    (0, response_1.sendPaginated)(res, djs, (0, response_1.buildPaginationMeta)(total, page, limit));
}
//# sourceMappingURL=dj.controller.js.map