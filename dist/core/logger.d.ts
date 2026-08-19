import pino from 'pino';
/**
 * Structured logger configured to write exclusively to stderr.
 * This guarantees MCP stdout stream remains uncorrupted for JSON-RPC messages.
 */
export declare const logger: pino.Logger<never, boolean>;
export default logger;
//# sourceMappingURL=logger.d.ts.map