import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Request logging middleware
 * Logs incoming requests and completed responses with method, path, status code, and duration
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const { method, path, query } = req
  
  // Log incoming request at debug level (or skip for health checks to reduce noise)
  const isHealthCheck = path === '/health'
  
  if (!isHealthCheck) {
    logger.debug('Incoming request', {
      method,
      path,
      ...(Object.keys(query).length > 0 && { query })
    })
  }
  
  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start
    const { statusCode } = res
    
    // Determine log level based on status code
    const logData = {
      method,
      path,
      statusCode,
      durationMs: duration
    }
    
    if (statusCode >= 500) {
      logger.error('Request completed', logData)
    } else if (statusCode >= 400) {
      logger.warn('Request completed', logData)
    } else {
      // For health checks, use debug level to reduce noise
      if (isHealthCheck) {
        logger.debug('Request completed', logData)
      } else {
        logger.info('Request completed', logData)
      }
    }
  })
  
  next()
}
