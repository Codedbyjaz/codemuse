/**
 * Security utilities for application hardening
 * Implementing the security standards for CodeMuse app
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import { createLogger } from './response';

const logger = createLogger('security', 'SecurityUtils');

// Bcrypt configuration
const SALT_ROUNDS = 10;

/**
 * Hash a password securely using bcrypt
 */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with its hash to verify it
 */
export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Configure Helmet middleware for Express
 * Adds various HTTP headers for security
 */
export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Monaco Editor
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  });
}

/**
 * Rate limiter for general API routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error', 
    message: 'Too many requests, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * Stricter rate limiter for auth routes
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error',
    message: 'Too many login attempts, please try again later.',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * Rate limiter for AI chat to prevent abuse
 */
export const aiChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // limit each IP to 30 AI requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error',
    message: 'AI chat rate limit exceeded, please try again later.',
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED'
    }
  }
});

/**
 * Middleware to set secure cookies
 */
export function setSecureCookie(res: Response, name: string, value: string, maxAge = 24 * 60 * 60 * 1000) {
  res.cookie(name, value, {
    maxAge,
    httpOnly: true, // prevents JavaScript access
    secure: process.env.NODE_ENV === 'production', // only send over HTTPS in production
    sameSite: 'strict', // prevents CSRF attacks
  });
}

/**
 * Maintenance mode middleware
 * This can be toggled via environment variable to disable critical app functionality
 */
export function maintenanceMode(req: Request, res: Response, next: NextFunction) {
  if (process.env.MAINTENANCE_MODE === 'true' && 
      !req.path.startsWith('/api/health') && 
      !req.path.startsWith('/maintenance')) {
    return res.status(503).json({
      status: 'error',
      message: 'The system is currently under maintenance. Please try again later.',
      error: {
        code: 'MAINTENANCE_MODE'
      }
    });
  }
  next();
}

/**
 * Middleware for basic admin authentication
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  // Check for admin login cookie or session
  const isAdmin = req.cookies?.['admin_session'] === process.env.ADMIN_SESSION_TOKEN;
  
  if (!isAdmin) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access to admin area',
      error: {
        code: 'UNAUTHORIZED_ADMIN'
      }
    });
  }
  
  next();
}

/**
 * Security event logging for suspicious activities
 */
export function logSecurityEvent(eventType: string, details: any, severity: 'low' | 'medium' | 'high' = 'low') {
  logger.warn(`Security event [${severity}] - ${eventType}`, details);
  
  // In production, this could send alerts via webhook/email
  if (severity === 'high' && process.env.SECURITY_WEBHOOK_URL) {
    // Implement webhook notification for high severity events
    // Could use fetch() to send alert to Discord, Slack, etc.
  }
}