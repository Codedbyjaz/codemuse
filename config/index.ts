/**
 * Configuration Module
 * 
 * Centralizes all configuration settings for the application
 * to make it easier to manage environment-specific settings.
 */
import * as path from 'path';
import * as fs from 'fs-extra';

// Base paths
export const ROOT_PATH = process.cwd();
export const PROJECT_PATH = path.join(ROOT_PATH, 'project');
export const SANDBOX_PATH = path.join(ROOT_PATH, 'sandbox');
export const LOGS_PATH = path.join(ROOT_PATH, 'logs');
export const SYNC_STORAGE_PATH = path.join(ROOT_PATH, 'sync_storage');
export const PLUGINS_PATH = path.join(ROOT_PATH, 'plugins');

// Ensure critical directories exist
(async () => {
  await Promise.all([
    fs.ensureDir(PROJECT_PATH),
    fs.ensureDir(SANDBOX_PATH),
    fs.ensureDir(LOGS_PATH),
    fs.ensureDir(SYNC_STORAGE_PATH),
    fs.ensureDir(PLUGINS_PATH)
  ]);
})();

// Environment-specific settings
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';

// Server configuration
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const HOST = process.env.HOST || '0.0.0.0';

// API configuration
export const API_PREFIX = '/api';
export const API_VERSION = 'v1';

// Security settings
export const TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
export const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true';
export const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'voidsync-dev-secret';

// Rate limiting
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX = 100; // 100 requests per window

// Sync settings
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const SYNC_HISTORY_LIMIT = 100; // Number of sync entries to keep
export const LOCK_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Plugin settings
export const PLUGIN_TIMEOUT = 5000; // 5 seconds timeout for plugin execution

// WebSocket settings
export const WS_PATH = '/ws';
export const WS_PING_INTERVAL = 30000; // 30 seconds

// Log settings
export const LOG_LEVEL: 'debug' | 'info' | 'warning' | 'error' = 
  (process.env.LOG_LEVEL as any) || (IS_PRODUCTION ? 'info' : 'debug');

// Export all settings as a single object
export default {
  paths: {
    root: ROOT_PATH,
    project: PROJECT_PATH,
    sandbox: SANDBOX_PATH,
    logs: LOGS_PATH,
    syncStorage: SYNC_STORAGE_PATH,
    plugins: PLUGINS_PATH
  },
  env: {
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    isTest: IS_TEST
  },
  server: {
    port: PORT,
    host: HOST,
    apiPrefix: API_PREFIX,
    apiVersion: API_VERSION
  },
  security: {
    tokenExpiry: TOKEN_EXPIRY,
    requireAuth: REQUIRE_AUTH,
    authTokenSecret: AUTH_TOKEN_SECRET,
    rateLimit: {
      window: RATE_LIMIT_WINDOW,
      max: RATE_LIMIT_MAX
    }
  },
  sync: {
    maxFileSize: MAX_FILE_SIZE,
    historyLimit: SYNC_HISTORY_LIMIT,
    lockExpiry: LOCK_EXPIRY
  },
  plugins: {
    timeout: PLUGIN_TIMEOUT
  },
  ws: {
    path: WS_PATH,
    pingInterval: WS_PING_INTERVAL
  },
  logs: {
    level: LOG_LEVEL
  }
};