/**
 * Rate Limiting Module
 * 
 * Provides utilities for tracking and limiting request rates from agents
 * to prevent abuse and ensure fair usage of resources.
 */
import { log } from './logger';
import { storage } from '../storage';
import { env } from '../config/environment';

// In-memory cache of rate limits for quick access
const rateLimitCache = new Map<string, RateLimitInfo>();

interface RateLimitInfo {
  agentId: string;
  requestCount: number;
  windowStart: number;
  lastUpdated: number;
  blockedUntil?: number;
}

/**
 * Track a request from an agent for rate limiting purposes
 * @param agentId The agent's ID
 * @returns The updated request count in current window
 */
export async function trackAgentRequest(agentId: string): Promise<number> {
  const now = Date.now();
  
  // Get rate limit info from cache or create new
  let rateLimitInfo = rateLimitCache.get(agentId);
  
  if (!rateLimitInfo) {
    rateLimitInfo = {
      agentId,
      requestCount: 0,
      windowStart: now,
      lastUpdated: now
    };
    rateLimitCache.set(agentId, rateLimitInfo);
  }
  
  // Check if we need to reset the window
  const windowSize = env.RATE_LIMIT_WINDOW_MS;
  if (now - rateLimitInfo.windowStart > windowSize) {
    rateLimitInfo.requestCount = 0;
    rateLimitInfo.windowStart = now;
  }
  
  // Increment request count
  rateLimitInfo.requestCount++;
  rateLimitInfo.lastUpdated = now;
  
  // Update in database asynchronously
  try {
    // Get existing rate limits from DB
    const existingLimits = await storage.getRateLimits(agentId);
    
    if (existingLimits.length > 0) {
      // Update existing
      await storage.updateRateLimit(existingLimits[0].id, {
        requestCount: rateLimitInfo.requestCount,
        windowStart: new Date(rateLimitInfo.windowStart),
        lastUpdated: new Date(now)
      });
    } else {
      // Create new
      await storage.createRateLimit({
        agentId,
        requestCount: rateLimitInfo.requestCount,
        windowStart: new Date(rateLimitInfo.windowStart),
        lastUpdated: new Date(now)
      });
    }
  } catch (error) {
    log('error', 'ratelimit', `Failed to update rate limit for ${agentId}`, { error });
  }
  
  return rateLimitInfo.requestCount;
}

/**
 * Check if an agent is currently rate limited
 * @param agentId The agent's ID
 * @returns Whether the agent is rate limited
 */
export async function isRateLimited(agentId: string): Promise<boolean> {
  const now = Date.now();
  const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;
  
  // Check cache first
  const rateLimitInfo = rateLimitCache.get(agentId);
  
  if (rateLimitInfo) {
    // Check if blocked
    if (rateLimitInfo.blockedUntil && now < rateLimitInfo.blockedUntil) {
      log('warn', 'ratelimit', `Agent ${agentId} is blocked until ${new Date(rateLimitInfo.blockedUntil).toISOString()}`);
      return true;
    }
    
    // Check if rate limited
    const isWithinWindow = now - rateLimitInfo.windowStart <= env.RATE_LIMIT_WINDOW_MS;
    const isLimited = isWithinWindow && rateLimitInfo.requestCount > maxRequests;
    
    if (isLimited) {
      // Block for twice the window time if exceeding by 50%
      if (rateLimitInfo.requestCount > maxRequests * 1.5) {
        const blockDuration = env.RATE_LIMIT_WINDOW_MS * 2;
        rateLimitInfo.blockedUntil = now + blockDuration;
        
        log('warn', 'ratelimit', `Agent ${agentId} is blocked for ${blockDuration}ms due to excessive requests`, {
          requestCount: rateLimitInfo.requestCount,
          maxRequests,
          blockedUntil: new Date(rateLimitInfo.blockedUntil).toISOString()
        });
      } else {
        log('warn', 'ratelimit', `Agent ${agentId} is rate limited`, {
          requestCount: rateLimitInfo.requestCount,
          maxRequests
        });
      }
    }
    
    return isLimited;
  }
  
  // If not in cache, check database
  try {
    const limits = await storage.getRateLimits(agentId);
    
    if (limits.length === 0) {
      // No rate limit info yet
      return false;
    }
    
    const limit = limits[0];
    const windowStart = limit.windowStart.getTime();
    const isWithinWindow = now - windowStart <= env.RATE_LIMIT_WINDOW_MS;
    const isLimited = isWithinWindow && limit.requestCount > maxRequests;
    
    // Update cache
    rateLimitCache.set(agentId, {
      agentId,
      requestCount: limit.requestCount,
      windowStart,
      lastUpdated: limit.lastUpdated.getTime()
    });
    
    if (isLimited) {
      log('warn', 'ratelimit', `Agent ${agentId} is rate limited (from DB)`, {
        requestCount: limit.requestCount,
        maxRequests
      });
    }
    
    return isLimited;
  } catch (error) {
    log('error', 'ratelimit', `Failed to check rate limit for ${agentId}`, { error });
    return false;
  }
}

/**
 * Reset rate limit for an agent
 * @param agentId The agent's ID
 */
export async function resetRateLimit(agentId: string): Promise<boolean> {
  try {
    // Clear from cache
    rateLimitCache.delete(agentId);
    
    // Clear from database
    const limits = await storage.getRateLimits(agentId);
    
    if (limits.length > 0) {
      await storage.updateRateLimit(limits[0].id, {
        requestCount: 0,
        windowStart: new Date(),
        lastUpdated: new Date()
      });
    }
    
    log('info', 'ratelimit', `Reset rate limit for ${agentId}`);
    return true;
  } catch (error) {
    log('error', 'ratelimit', `Failed to reset rate limit for ${agentId}`, { error });
    return false;
  }
}

/**
 * Block an agent for a specified duration
 * @param agentId The agent's ID
 * @param durationMs Duration in milliseconds
 */
export async function blockAgent(agentId: string, durationMs: number): Promise<boolean> {
  try {
    const now = Date.now();
    const blockedUntil = now + durationMs;
    
    // Update cache
    let rateLimitInfo = rateLimitCache.get(agentId);
    
    if (!rateLimitInfo) {
      rateLimitInfo = {
        agentId,
        requestCount: 0,
        windowStart: now,
        lastUpdated: now,
        blockedUntil
      };
    } else {
      rateLimitInfo.blockedUntil = blockedUntil;
    }
    
    rateLimitCache.set(agentId, rateLimitInfo);
    
    log('info', 'ratelimit', `Blocked agent ${agentId} until ${new Date(blockedUntil).toISOString()}`);
    return true;
  } catch (error) {
    log('error', 'ratelimit', `Failed to block agent ${agentId}`, { error });
    return false;
  }
}