"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const logLevel = process.env.HYPERION_LOG_LEVEL || 'info';
/**
 * Structured logger configured to write exclusively to stderr.
 * This guarantees MCP stdout stream remains uncorrupted for JSON-RPC messages.
 */
exports.logger = (0, pino_1.default)({
    level: logLevel,
    base: undefined,
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
}, process.stderr);
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map