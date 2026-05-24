"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDJs = listDJs;
exports.getDJ = getDJ;
exports.createDJ = createDJ;
exports.updateDJ = updateDJ;
exports.deleteDJ = deleteDJ;
const dj_service_1 = require("../../services/admin/dj.service");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
async function listDJs(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search } = req.query;
    const { djs, total } = await dj_service_1.DJService.listDJs({
        search,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, djs, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getDJ(req, res) {
    const dj = await dj_service_1.DJService.getDJById(req.params.id);
    (0, response_1.sendSuccess)(res, dj);
}
async function createDJ(req, res) {
    const body = req.body;
    const dj = await dj_service_1.DJService.createDJ(body);
    logger_1.logger.info({ djId: dj._id }, 'Admin created DJ operator via service');
    (0, response_1.sendCreated)(res, dj, 'DJ Operator created successfully');
}
async function updateDJ(req, res) {
    const body = req.body;
    const dj = await dj_service_1.DJService.updateDJ(req.params.id, body);
    logger_1.logger.info({ djId: dj._id }, 'Admin updated DJ operator via service');
    (0, response_1.sendSuccess)(res, dj, 'DJ Operator updated successfully');
}
async function deleteDJ(req, res) {
    await dj_service_1.DJService.deleteDJ(req.params.id);
    logger_1.logger.info({ djId: req.params.id }, 'Admin deleted DJ operator via service');
    (0, response_1.sendSuccess)(res, null, 'DJ Operator deleted successfully');
}
//# sourceMappingURL=dj.controller.js.map