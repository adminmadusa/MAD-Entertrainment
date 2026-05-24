"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoose = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const logger_1 = require("../utils/logger");
const env_1 = require("./env");
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
let retryCount = 0;
const connectOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 100,
    minPoolSize: 2,
    bufferCommands: false,
    autoIndex: process.env.NODE_ENV !== 'production',
};
async function connectDatabase() {
    const env = (0, env_1.getEnv)();
    const uri = env.MONGODB_URI;
    mongoose_1.default.connection.on('connected', () => {
        logger_1.logger.info('✅ MongoDB connected successfully');
        retryCount = 0;
    });
    mongoose_1.default.connection.on('error', (err) => {
        logger_1.logger.error({ err }, '❌ MongoDB connection error');
    });
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.logger.warn('⚠️  MongoDB disconnected');
    });
    await attemptConnect(uri);
}
async function attemptConnect(uri) {
    try {
        await mongoose_1.default.connect(uri, connectOptions);
    }
    catch (err) {
        retryCount++;
        logger_1.logger.error({ err, attempt: retryCount }, `MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES})`);
        if (retryCount < MAX_RETRIES) {
            logger_1.logger.info(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            return attemptConnect(uri);
        }
        else {
            logger_1.logger.error('Max MongoDB retry attempts reached. Exiting.');
            process.exit(1);
        }
    }
}
async function disconnectDatabase() {
    await mongoose_1.default.connection.close();
    logger_1.logger.info('MongoDB connection closed');
}
function isDatabaseConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
//# sourceMappingURL=database.js.map