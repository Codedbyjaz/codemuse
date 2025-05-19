/**
 * Environment Configuration Module
 * 
 * Provides centralized access to environment variables with defaults
 * and typings to ensure consistent configuration across the application.
 */
import * as path from 'path';
import * as fs from 'fs-extra';

// Base environment configuration
export interface Environment {
  // Server configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database configuration
  DATABASE_URL: string;
  
  // Security
  JWT_SECRET: string;
  SESSION_SECRET: string;
  
  // Application paths
  PROJECT_ROOT: string;
  LOGS_DIR: string;
  PROJECT_DIR: string;
  SANDBOX_DIR: string;
  
  // Feature flags
  ENABLE_WEBSOCKETS: boolean;
  DEBUG_MODE: string;
  
  // Timeouts and limits
  REQUEST_TIMEOUT_MS: number;
  MAX_PAYLOAD_SIZE_MB: number;
  DEFAULT_SYNC_TIMEOUT: number;
  MAX_CONCURRENT_SYNC: number;
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

// Load environment variables with defaults
export const env: Environment = {
  // Server configuration
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret',
  
  // Application paths
  PROJECT_ROOT: path.resolve('.'),
  LOGS_DIR: path.resolve('logs'),
  PROJECT_DIR: path.resolve('project'),
  SANDBOX_DIR: path.resolve('sandbox'),
  
  // Feature flags
  ENABLE_WEBSOCKETS: process.env.ENABLE_WEBSOCKETS !== 'false',
  DEBUG_MODE: process.env.DEBUG_MODE || 'false',
  
  // Timeouts and limits
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  MAX_PAYLOAD_SIZE_MB: parseInt(process.env.MAX_PAYLOAD_SIZE_MB || '50', 10),
  DEFAULT_SYNC_TIMEOUT: parseInt(process.env.DEFAULT_SYNC_TIMEOUT || '60000', 10),
  MAX_CONCURRENT_SYNC: parseInt(process.env.MAX_CONCURRENT_SYNC || '5', 10),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

// Ensure required directories exist
export async function initConfigDirectories(): Promise<void> {
  // Create required directories if they don't exist
  const directories = [
    env.LOGS_DIR,
    env.PROJECT_DIR,
    env.SANDBOX_DIR
  ];
  
  for (const dir of directories) {
    try {
      const exists = await fs.pathExists(dir);
      if (!exists) {
        await fs.ensureDir(dir);
        console.log(`Created directory: ${dir}`);
      }
    } catch (error) {
      console.error(`Failed to create directory: ${dir}`, error);
    }
  }
}

// Validate required environment variables in production
export function validateEnvironment(): void {
  if (env.NODE_ENV === 'production') {
    const requiredVars = [
      'DATABASE_URL', 
      'JWT_SECRET', 
      'SESSION_SECRET'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Make sure directories are initialized
// Call async function but don't wait for it
initConfigDirectories().catch(err => {
  console.error('Failed to initialize config directories:', err);
});