import pino from 'pino';

const logLevel = process.env.HYPERION_LOG_LEVEL || 'info';

/**
 * Structured logger configured to write exclusively to stderr.
 * This guarantees MCP stdout stream remains uncorrupted for JSON-RPC messages.
 */
export const logger = pino(
  {
    level: logLevel,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  process.stderr
);

export default logger;
