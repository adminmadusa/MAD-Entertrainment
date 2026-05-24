"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.httpRequestDurationMicroseconds = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.httpRequestDurationMicroseconds = new prom_client_1.default.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [50, 100, 300, 500, 1000, 2000, 5000],
});
exports.register = prom_client_1.default.register;
//# sourceMappingURL=metrics.js.map