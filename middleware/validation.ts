/**
 * Validation Middleware
 * 
 * Provides request validation middleware using Zod schemas to ensure
 * data integrity and consistent error handling.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as path from 'path';
import { log } from '../utils/logger';
import { handleValidationError } from '../utils/responseHandler';

/**
 * Creates a middleware function that validates request data using a Zod schema
 * @param schema Zod schema to validate against
 * @param source Source of data to validate (body, query, params)
 */
export function validate(
  schema: z.ZodType<any>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get data to validate based on source
      const data = req[source];
      
      // Validate data against schema
      const result = schema.parse(data);
      
      // Replace original data with validated result
      req[source] = result;
      
      // Continue to next middleware
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation error
        handleValidationError(res, error, 'validation');
      } else {
        // Handle unexpected error
        log('error', 'validation', 'Unexpected validation error', { error });
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred during validation'
        });
      }
    }
  };
}

// Reusable schemas for common validation patterns
export const schemas = {
  // ID parameter schema
  id: z.object({
    id: z.string().transform((val, ctx) => {
      const parsed = parseInt(val);
      if (isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ID must be a valid number'
        });
        return z.NEVER;
      }
      return parsed;
    })
  }),
  
  // Pagination schema
  pagination: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
    limit: z.string().optional().transform((val) => {
      const limit = val ? parseInt(val) : 20;
      return limit > 100 ? 100 : limit; // Cap at 100
    })
  }),
  
  // UUID schema
  uuid: z.string().uuid(),
  
  // Agent ID schema (allow uuids or specific format)
  agentId: z.string().min(3).max(50),
  
  // File path schema
  filePath: z.string().min(1).max(500).refine(
    (val) => !val.includes('..'), 
    { message: 'File path cannot contain directory traversal sequences' }
  ),
  
  // API key schema (custom format)
  apiKey: z.string().regex(/^[a-zA-Z0-9_-]{20,64}$/),
  
  // Agent sync schema
  agentSync: z.object({
    agentId: z.string().min(3),
    force: z.boolean().optional().default(false)
  }),
  
  // Change status schema
  changeStatus: z.enum(['pending', 'approved', 'rejected', 'locked']),
  
  // Date range schema
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
};

// Specific request validation schemas
export const requestSchemas = {
  // Agent creation schema
  createAgent: z.object({
    name: z.string().min(1).max(100),
    agentId: schemas.agentId,
    type: z.string().min(1).max(50),
    status: z.enum(['active', 'inactive', 'disabled']).default('active'),
    metadata: z.record(z.any()).optional()
  }),
  
  // Agent update schema
  updateAgent: z.object({
    name: z.string().min(1).max(100).optional(),
    status: z.enum(['active', 'inactive', 'disabled']).optional(),
    metadata: z.record(z.any()).optional()
  }),
  
  // Change creation schema
  createChange: z.object({
    agentId: schemas.agentId,
    filePath: schemas.filePath,
    diffContent: z.string().min(1),
    originalContent: z.string().optional().default(''),
    status: schemas.changeStatus.default('pending'),
    metadata: z.record(z.any()).optional()
  }),
  
  // Change update schema
  updateChange: z.object({
    status: schemas.changeStatus,
    metadata: z.record(z.any()).optional()
  }),
  
  // Lock creation schema
  createLock: z.object({
    filePath: schemas.filePath,
    pattern: z.string().nullable().optional()
  }),
  
  // Sync API schema
  sync: z.object({
    agentId: schemas.agentId,
    filePath: schemas.filePath,
    content: z.string().min(1)
  })
};

/**
 * Validates environment variables on startup
 * Logs warnings for missing or invalid variables
 */
export function validateEnvironment(): void {
  const validations = [
    { name: 'NODE_ENV', validator: (val: string) => ['development', 'production', 'test'].includes(val) },
    { name: 'PORT', validator: (val: string) => !isNaN(parseInt(val)) },
    { name: 'DATABASE_URL', validator: (val: string) => val && val.length > 10 },
    { name: 'API_KEYS', validator: (val: string) => val && val.length > 0, optional: true },
    { name: 'WEBHOOK_SECRET', validator: (val: string) => val && val.length >= 10, optional: true },
    { name: 'REPLICATE_API_KEY', validator: (val: string) => val && val.length > 10, optional: true }
  ];
  
  validations.forEach(validation => {
    const value = process.env[validation.name];
    
    if (!value) {
      if (validation.optional) {
        log('warning', 'env', `Optional environment variable ${validation.name} is not set`);
      } else {
        log('error', 'env', `Required environment variable ${validation.name} is not set`);
      }
      return;
    }
    
    if (!validation.validator(value)) {
      log('error', 'env', `Environment variable ${validation.name} has invalid value`);
    }
  });
}

/**
 * Sanitizes file paths to prevent directory traversal
 * @param filePath File path to sanitize
 * @returns Sanitized file path
 */
export function sanitizeFilePath(filePath: string): string {
  // Normalize path and remove any directory traversal sequences
  const normalized = path.normalize(filePath)
    .replace(/^(\.\.[\/\\])+/, '')
    .replace(/^[\/\\]+/, '');
  
  return normalized;
}