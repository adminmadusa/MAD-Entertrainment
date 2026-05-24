"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startConsistencyWorker = startConsistencyWorker;
exports.stopConsistencyWorker = stopConsistencyWorker;
const consistency_service_1 = require("../services/consistency.service");
const logger_1 = require("../utils/logger");
let interval = null;
let running = false;
function startConsistencyWorker() {
    if (interval)
        return;
    interval = setInterval(async () => {
        if (running)
            return;
        running = true;
        try {
            await consistency_service_1.ConsistencyService.runRepairCycle();
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Consistency worker cycle failed');
        }
        finally {
            running = false;
        }
    }, 30000);
    interval.unref?.();
    logger_1.logger.info('Consistency worker started');
}
function stopConsistencyWorker() {
    if (interval) {
        clearInterval(interval);
        interval = null;
        logger_1.logger.info('Consistency worker stopped');
    }
}
//# sourceMappingURL=consistency.worker.js.map