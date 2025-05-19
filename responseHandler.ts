/**
 * Response Handler Utility
 * 
 * Provides standardized response formatting for API endpoints
 * with consistent error and success handling.
 */
import { Response } from 'express';
import { log } from './logger';
import { ApiResponse } from '@shared/types';

/**
 * Send a success response
 * @param res Express response object
 * @param data Response data
 * @param message Optional success message
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param res Express response object
 * @param error Error message or object
 * @param statusCode HTTP status code (default: 400)
 * @param logCategory Optional log category
 */
export function sendError(
  res: Response,
  error: string | Error,
  statusCode: number = 400,
  logCategory: string = 'api'
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  
  // Log the error
  log('error', logCategory, `API Error: ${errorMessage}`, {
    status: statusCode,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  });
  
  const response: ApiResponse = {
    success: false,
    error: errorMessage
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send a not found response
 * @param res Express response object
 * @param entityType Entity type (e.g., 'User', 'Post')
 * @param id Entity ID
 */
export function sendNotFound(
  res: Response,
  entityType: string,
  id: string | number
): void {
  sendError(
    res,
    `${entityType} with ID ${id} not found`,
    404
  );
}

/**
 * Send an unauthorized response
 * @param res Express response object
 * @param message Optional message
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized'
): void {
  sendError(
    res,
    message,
    401,
    'auth'
  );
}

/**
 * Send a forbidden response
 * @param res Express response object
 * @param message Optional message
 */
export function sendForbidden(
  res: Response,
  message: string = 'Forbidden'
): void {
  sendError(
    res,
    message,
    403,
    'auth'
  );
}

/**
 * Send a validation error response
 * @param res Express response object
 * @param errors Validation errors
 */
export function sendValidationError(
  res: Response,
  errors: string | string[] | Record<string, string[]>
): void {
  const formattedErrors = typeof errors === 'string' 
    ? { message: [errors] }
    : Array.isArray(errors) 
      ? { message: errors }
      : errors;
      
  const response: ApiResponse = {
    success: false,
    error: 'Validation error',
    data: { errors: formattedErrors }
  };
  
  res.status(422).json(response);
}