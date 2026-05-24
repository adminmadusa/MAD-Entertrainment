"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Executes the provided callback within a MongoDB transaction.
 * The callback receives the active session which must be passed to all Mongoose operations.
 * On success the transaction is committed; on error it is aborted and the error re‑thrown.
 */
async function withTransaction(fn) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
}
//# sourceMappingURL=transaction.js.map