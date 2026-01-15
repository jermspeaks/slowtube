import { Response } from 'express'

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Standard paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

/**
 * Standard success response structure
 */
export interface SuccessResponse<T> {
  data: T
  message?: string
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  message?: string
  code?: string
  details?: any
}

/**
 * Create a standardized paginated response
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Paginated response object
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

/**
 * Create a standardized success response
 * @param data - Response data
 * @param message - Optional success message
 * @returns Success response object
 */
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  const response: SuccessResponse<T> = { data }
  if (message) {
    response.message = message
  }
  return response
}

/**
 * Create a standardized error response
 * @param error - Error message or error code
 * @param message - Detailed error message
 * @param code - Error code
 * @returns Error response object
 */
export function errorResponse(
  error: string,
  message?: string,
  code?: string
): ErrorResponse {
  const response: ErrorResponse = { error }
  if (message) {
    response.message = message
  }
  if (code) {
    response.code = code
  }
  return response
}

/**
 * Send a paginated response
 * @param res - Express response object
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 */
export function sendPaginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  res.json(paginatedResponse(data, page, limit, total))
}

/**
 * Send a success response
 * @param res - Express response object
 * @param data - Response data
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  res.status(statusCode).json(successResponse(data, message))
}

/**
 * Send an error response
 * @param res - Express response object
 * @param error - Error message or error code
 * @param message - Detailed error message
 * @param code - Error code
 * @param statusCode - HTTP status code (default: 400)
 */
export function sendErrorResponse(
  res: Response,
  error: string,
  message?: string,
  code?: string,
  statusCode: number = 400
): void {
  res.status(statusCode).json(errorResponse(error, message, code))
}
