import { Request, Response, NextFunction } from 'express'

/**
 * Validate and parse ID parameter from request params
 * @param paramName - Name of the parameter (default: 'id')
 * @returns Middleware function
 */
export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params[paramName], 10)
    
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ 
        error: 'Invalid ID',
        message: `${paramName} must be a valid positive integer`
      })
    }
    
    // Attach parsed ID to request for use in route handlers
    ;(req as any).validatedId = id
    next()
  }
}

/**
 * Helper function to validate entity exists
 * @param queries - Object with getById method
 * @param entityName - Name of the entity for error messages
 * @returns Middleware function
 */
export function validateEntityExists<T>(
  queries: { getById: (id: number) => T | null },
  entityName: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req as any).validatedId as number | undefined
    
    if (!id) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'ID validation required before entity existence check'
      })
    }
    
    const entity = queries.getById(id)
    
    if (!entity) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `${entityName} not found`
      })
    }
    
    // Attach entity to request for use in route handlers
    ;(req as any).validatedEntity = entity
    next()
  }
}

/**
 * Validate and parse pagination parameters
 * @param page - Page number as string
 * @param limit - Limit as string
 * @returns Object with validated page, limit, and offset
 * @throws Error if validation fails
 */
export function validatePagination(
  page?: string | number,
  limit?: string | number
): { page: number; limit: number; offset: number } {
  const pageNum = typeof page === 'number' ? page : (page ? parseInt(page, 10) : 1)
  const limitNum = typeof limit === 'number' ? limit : (limit ? parseInt(limit, 10) : 50)
  
  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Invalid page number')
  }
  
  if (isNaN(limitNum) || limitNum < 1) {
    throw new Error('Invalid limit')
  }
  
  const offset = (pageNum - 1) * limitNum
  
  return { page: pageNum, limit: limitNum, offset }
}

/**
 * Validate sortBy parameter against allowed values
 * @param value - Value to validate
 * @param allowed - Array of allowed values
 * @returns Validated value or undefined
 */
export function validateSortBy<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  
  return allowed.includes(value as T) ? (value as T) : undefined
}

/**
 * Validate sortOrder parameter
 * @param value - Value to validate
 * @returns 'asc' | 'desc' | undefined
 */
export function validateSortOrder(value: unknown): 'asc' | 'desc' | undefined {
  if (value === 'asc' || value === 'desc') {
    return value
  }
  return undefined
}

/**
 * Validate boolean parameter
 * @param value - Value to validate
 * @param paramName - Name of parameter for error messages
 * @returns boolean | undefined
 */
export function validateBooleanParam(value: unknown, paramName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'string') {
    if (value === 'true' || value === '1') {
      return true
    }
    if (value === 'false' || value === '0') {
      return false
    }
  }
  
  return undefined
}

/**
 * Validate required body field
 * @param fieldName - Name of the field
 * @param type - Expected type ('string', 'number', 'boolean', 'array')
 * @returns Middleware function
 */
export function validateBodyField(fieldName: string, type: 'string' | 'number' | 'boolean' | 'array' = 'string') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Express 5: req.body may be undefined if no parser is used
    if (!req.body) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Request body is required'
      })
    }
    
    const value = req.body[fieldName]
    
    if (value === undefined || value === null) {
      return res.status(400).json({
        error: 'Validation error',
        message: `${fieldName} is required`
      })
    }
    
    let isValid = false
    
    switch (type) {
      case 'string':
        isValid = typeof value === 'string'
        break
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value)
        break
      case 'boolean':
        isValid = typeof value === 'boolean'
        break
      case 'array':
        isValid = Array.isArray(value)
        break
    }
    
    if (!isValid) {
      return res.status(400).json({
        error: 'Validation error',
        message: `${fieldName} must be of type ${type}`
      })
    }
    
    next()
  }
}
