import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string
  message?: string
  code?: string
  details?: any
}

/**
 * Base error class for application errors
 */
export class AppError extends Error {
  statusCode: number
  code?: string
  details?: any

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details)
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', details)
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
  }
}

/**
 * Handle YouTube authentication errors consistently
 * @param error - Error object
 * @param res - Express response object
 */
export function handleAuthError(error: any, res: Response): void {
  if (error.code === 'AUTHENTICATION_REQUIRED' || error.message?.includes('authentication')) {
    res.status(401).json({
      error: 'YouTube authentication required',
      message: 'Please connect your YouTube account in Settings to use this feature.',
      code: 'AUTHENTICATION_REQUIRED',
      requiresAuth: true,
      settingsUrl: '/settings'
    })
  } else {
    throw error
  }
}

/**
 * Express error handler middleware
 * Should be added last in the middleware chain
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
    ...(err instanceof AppError && {
      statusCode: err.statusCode,
      code: err.code,
      details: err.details
    })
  })

  // Handle known application errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.name.replace('Error', ''),
      message: err.message,
      code: err.code,
    }

    if (err.details) {
      response.details = err.details
    }

    res.status(err.statusCode).json(response)
    return
  }

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    res.status(400).json({
      error: 'Validation error',
      message: err.message,
      code: 'VALIDATION_ERROR'
    })
    return
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  })
}

/**
 * Async error wrapper to catch errors in async route handlers
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
