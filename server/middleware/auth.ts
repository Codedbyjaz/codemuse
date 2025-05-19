/**
 * Authentication Middleware
 * 
 * Provides middleware for authenticating requests via API keys,
 * JWT tokens, and validating agent-specific permissions.
 */
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { storage } from '../storage';
import { log } from '../utils/logger';

// Tracks API request rates for rate limiting
const requestRates: Record<string, { count: number, lastReset: Date }> = {};

// Interval to reset rate tracking (1 hour)
const RATE_LIMIT_INTERVAL = 60 * 60 * 1000; 

// Maximum requests in the interval
const MAX_REQUESTS = 1000;

/**
 * Track a request for rate limiting
 * @param agentId Agent ID making the request
 */
export async function trackAgentRequest(agentId: string): Promise<void> {
  try {
    // Initialize tracking if not exists
    if (!requestRates[agentId]) {
      requestRates[agentId] = {
        count: 0,
        lastReset: new Date()
      };
    }
    
    // Check if we need to reset
    const now = new Date();
    const elapsed = now.getTime() - requestRates[agentId].lastReset.getTime();
    
    if (elapsed >= RATE_LIMIT_INTERVAL) {
      // Reset tracking
      requestRates[agentId] = {
        count: 1,
        lastReset: now
      };
    } else {
      // Increment
      requestRates[agentId].count++;
    }
    
    // Store in database for persistence
    const rateLimits = await storage.getRateLimits(agentId);
    
    if (rateLimits.length > 0) {
      // Update existing
      await storage.updateRateLimit(rateLimits[0].id, {
        requestCount: requestRates[agentId].count,
        windowStart: requestRates[agentId].lastReset
      });
    } else {
      // Create new
      await storage.createRateLimit({
        agentId,
        requestCount: requestRates[agentId].count,
        windowStart: requestRates[agentId].lastReset,
        limit: MAX_REQUESTS,
        lastUpdated: new Date(),
        isBlocked: false
      });
    }
  } catch (error) {
    log('error', 'auth', 'Failed to track request rate', { error, agentId });
  }
}

/**
 * Check if an agent is rate limited
 * @param agentId Agent ID to check
 * @returns Whether the agent is rate limited
 */
export async function isRateLimited(agentId: string): Promise<boolean> {
  try {
    // Check in-memory cache first
    if (requestRates[agentId] && requestRates[agentId].count > MAX_REQUESTS) {
      return true;
    }
    
    // Check database for persistence across restarts
    const rateLimits = await storage.getRateLimits(agentId);
    
    if (rateLimits.length === 0) {
      return false;
    }
    
    const rateLimit = rateLimits[0];
    const limit = rateLimit.limit || MAX_REQUESTS;
    
    // Check if window has reset
    const now = new Date();
    const elapsed = now.getTime() - new Date(rateLimit.windowStart).getTime();
    
    if (elapsed >= RATE_LIMIT_INTERVAL) {
      // Reset in database
      await storage.updateRateLimit(rateLimit.id, {
        requestCount: 1,
        windowStart: now
      });
      
      // Reset in memory too
      requestRates[agentId] = {
        count: 1,
        lastReset: now
      };
      
      return false;
    }
    
    // Check if over limit
    return rateLimit.requestCount > limit;
  } catch (error) {
    log('error', 'auth', 'Failed to check rate limit', { error, agentId });
    return false; // Default to not limited on error
  }
}

/**
 * API key authentication middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      log('warning', 'auth', 'Missing API key', {
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Missing API key',
        message: 'API key is required for this endpoint'
      });
    }
    
    // TODO: Replace with actual API key validation from storage
    // For now, just check against the environment variable
    const validKey = process.env.API_KEY;
    
    if (!validKey || apiKey !== validKey) {
      log('warning', 'auth', 'Invalid API key', {
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }
    
    // Key is valid, proceed
    next();
  } catch (error) {
    log('error', 'auth', 'API key validation error', { error });
    
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Agent authentication middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function agentAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const agentId = req.headers['x-agent-id'] as string;
    const agentSecret = req.headers['x-agent-secret'] as string;
    
    if (!agentId || !agentSecret) {
      log('warning', 'auth', 'Missing agent credentials', {
        ip: req.ip,
        path: req.path
      });
      
      return res.status(401).json({
        success: false,
        error: 'Missing agent credentials',
        message: 'Agent ID and secret are required for this endpoint'
      });
    }
    
    // Attach to request for downstream use
    (req as any).agentId = agentId;
    
    // TODO: Implement actual agent secret validation from storage
    // For now, just proceed
    next();
  } catch (error) {
    log('error', 'auth', 'Agent authentication error', { error });
    
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during agent authentication'
    });
  }
}

/**
 * Rate limiting middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const agentId = (req as any).agentId;
    
    if (!agentId) {
      // No agent ID, skip rate limiting
      return next();
    }
    
    // Track request
    trackAgentRequest(agentId)
      .then(() => isRateLimited(agentId))
      .then((limited) => {
        if (limited) {
          log('warning', 'auth', 'Rate limit exceeded', {
            agentId,
            ip: req.ip,
            path: req.path
          });
          
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: 'You have exceeded the maximum number of requests allowed in the time period'
          });
        }
        
        // Not limited, proceed
        next();
      })
      .catch((error) => {
        log('error', 'auth', 'Rate limit check error', { error, agentId });
        next(); // Proceed on error
      });
  } catch (error) {
    log('error', 'auth', 'Rate limit middleware error', { error });
    next(); // Proceed on error
  }
}

/**
 * Get agent instance by ID with permissioning
 * @param agentId Agent ID
 * @returns Agent instance or null if not found
 */
export async function getAgentInstance(agentId: string) {
  try {
    // Get agent from database
    const agent = await storage.getAgentByAgentId(agentId);
    
    if (!agent) {
      return null;
    }
    
    // BaseAgent would be extended by specific implementations
    // This is a simplified version that just implements the canEditFile method
    return {
      id: agent.id,
      agentId: agent.agentId,
      name: agent.name,
      
      // Check if agent can edit a file
      canEditFile(filePath: string): boolean {
        // Parse config from metadata
        try {
          const config = agent.metadata?.config;
          
          if (!config || !config.canEdit) {
            return false;
          }
          
          const canEdit = Array.isArray(config.canEdit) ? config.canEdit : [];
          
          // Check if path matches any allowed pattern
          for (const pattern of canEdit) {
            try {
              const regex = new RegExp(pattern);
              
              if (regex.test(filePath)) {
                return true;
              }
            } catch {
              // Invalid regex, skip
            }
          }
          
          return false;
        } catch (error) {
          log('error', 'auth', 'Error checking agent edit permissions', { error, agentId });
          return false;
        }
      }
    };
  } catch (error) {
    log('error', 'auth', 'Error getting agent instance', { error, agentId });
    return null;
  }
}