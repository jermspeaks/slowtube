import winston from 'winston'

/**
 * Log levels in order of severity (lowest to highest)
 * error: 0, warn: 1, info: 2, debug: 3
 */
const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase()

/**
 * Winston logger instance with console transport
 * Supports configurable log levels via LOG_LEVEL environment variable
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`
      
      // Add stack trace for errors
      if (stack) {
        log += `\n${stack}`
      }
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`
      }
      
      return log
    })
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
})

// Log the configured log level on startup
logger.info(`Logger initialized with level: ${logLevel}`)
