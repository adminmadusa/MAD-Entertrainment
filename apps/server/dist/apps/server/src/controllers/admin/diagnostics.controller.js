"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConsistencyDiagnostics = getConsistencyDiagnostics;
exports.repairConsistency = repairConsistency;
exports.listReservations = listReservations;
const reservation_schema_1 = require("../../models/reservation.schema");
const consistency_service_1 = require("../../services/consistency.service");
const response_1 = require("../../utils/response");
async function getConsistencyDiagnostics(_req, res) {
    const report = await consistency_service_1.ConsistencyService.generateReport();
    (0, response_1.sendSuccess)(res, report);
}
async function repairConsistency(_req, res) {
    const report = await consistency_service_1.ConsistencyService.runRepairCycle();
    (0, response_1.sendSuccess)(res, report, 'Consistency repair cycle completed');
}
async function listReservations(req, res) {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const query = status ? { status } : {};
    const reservations = await reservation_schema_1.Reservation.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
    (0, response_1.sendSuccess)(res, reservations);
}
//# sourceMappingURL=diagnostics.controller.js.map