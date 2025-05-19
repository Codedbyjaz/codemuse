/**
 * Error Handler Middleware
 * 
 * Provides global error handling for API routes with consistent
 * formatting and logging of errors.
 */
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { log } from '../utils/logger';
import { sendError, sendValidationError } from '../utils/responseHandler';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    sendValidationError(res, validationError.message);
    return;
  }
  
  // Handle API errors
  if (err instanceof ApiError) {
    sendError(res, err, err.statusCode);
    return;
  }
  
  // Handle unexpected errors
  log('error', 'system', 'Unexpected server error', {
    error: err,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  
  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    500
  );
}

/**
 * Create an API error with NotFound status
 * @param message Error message
 * @returns NotFound API error
 */
export function notFound(message: string = 'Resource not found'): ApiError {
  return new ApiError(message, 404);
}

/**
 * Create an API error with Unauthorized status
 * @param message Error message
 * @returns Unauthorized API error
 */
export function unauthorized(message: string = 'Unauthorized'): ApiError {
  return new ApiError(message, 401);
}

/**
 * Create an API error with Forbidden status
 * @param message Error message
 * @returns Forbidden API error
 */
export function forbidden(message: string = 'Forbidden'): ApiError {
  return new ApiError(message, 403);
}

/**
 * Create an API error with Bad Request status
 * @param message Error message
 * @returns Bad Request API error
 */
export function badRequest(message: string = 'Bad request'): ApiError {
  return new ApiError(message, 400);
}

/**
 * Handle 404 errors for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    `Route not found: ${req.method} ${req.url}`,
    404
  );
}