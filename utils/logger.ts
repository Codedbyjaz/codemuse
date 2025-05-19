/**
 * Logger Utility
 * 
 * Provides a centralized logging mechanism for the application
 * with support for different log levels and contexts.
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Log context type
 */
export type LogContext = 'system' | 'sync' | 'api' | 'plugin' | 'auth' | 'storage' | 
                         'conflict' | 'diff' | 'sandbox' | 'commit' | 'locks' | 
                         'websocket' | 'fingerprint' | 'agent' | 'config';

/**
 * Get current timestamp in ISO format
 * @returns ISO timestamp string
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format a log entry
 * @param level Log level
 * @param context Log context
 * @param message Log message
 * @param data Additional data
 * @returns Formatted log entry
 */
function formatLogEntry(
  level: LogLevel,
  context: LogContext,
  message: string,
  data?: any
): string {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  
  let logMessage = `${prefix} ${message}`;
  
  if (data) {
    try {
      if (typeof data === 'string') {
        logMessage += ` - ${data}`;
      } else {
        // Format data as JSON, but handle circular references
        const serializedData = JSON.stringify(data, (key, value) => {
          if (key === 'error' && value instanceof Error) {
            return {
              message: value.message,
              stack: value.stack,
              name: value.name
            };
          }
          return value;
        }, 2);
        
        logMessage += ` - ${serializedData}`;
      }
    } catch (error) {
      logMessage += ` - [Error serializing data: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }
  
  return logMessage;
}

/**
 * Log a message
 * @param level Log level
 * @param context Log context
 * @param message Log message
 * @param data Additional data
 */
export function log(
  level: LogLevel,
  context: LogContext,
  message: string,
  data?: any
): void {
  const entry = formatLogEntry(level, context, message, data);
  
  switch (level) {
    case 'debug':
      console.debug(entry);
      break;
      
    case 'info':
      console.info(entry);
      break;
      
    case 'warning':
      console.warn(entry);
      break;
      
    case 'error':
    case 'critical':
      console.error(entry);
      break;
      
    default:
      console.log(entry);
      break;
  }
  
  // In a production system, you would likely also:
  // 1. Save logs to a file
  // 2. Send critical logs to a monitoring service
  // 3. Implement log rotation
}

/**
 * Logger factory for creating loggers with a fixed context
 * @param context Log context
 * @returns Logger functions scoped to the context
 */
export function createLogger(context: LogContext) {
  return {
    debug: (message: string, data?: any) => log('debug', context, message, data),
    info: (message: string, data?: any) => log('info', context, message, data),
    warning: (message: string, data?: any) => log('warning', context, message, data),
    error: (message: string, data?: any) => log('error', context, message, data),
    critical: (message: string, data?: any) => log('critical', context, message, data)
  };
}