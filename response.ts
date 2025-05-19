/**
 * Response utility for standardized API responses
 * Following Umbra Tech Standards for consistent API responses
 */

export type ApiResponse<T = any> = {
  status: 'success' | 'error';
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
};

/**
 * Creates a standardized success response
 * @param message Success message
 * @param data Response data
 * @returns Formatted API response
 */
export function successResponse<T>(message: string, data?: T): ApiResponse<T> {
  return {
    status: 'success',
    message,
    data
  };
}

/**
 * Creates a standardized error response
 * @param message Error message
 * @param errorCode Error code
 * @param details Additional error details
 * @returns Formatted API error response
 */
export function errorResponse(message: string, errorCode: string = 'UNKNOWN_ERROR', details?: any): ApiResponse {
  return {
    status: 'error',
    message,
    error: {
      code: errorCode,
      details
    }
  };
}

/**
 * Logger with contextual information
 * Following Umbra Tech Standards for logging
 * @param context The file or module context
 * @param functionName The function where logging occurs
 * @returns Logging function
 */
export function createLogger(context: string, functionName: string) {
  const prefix = `[CODEMUSE][${context}][${functionName}]`;
  
  return {
    info: (message: string, data?: any) => {
      console.log(`${prefix} INFO: ${message}`, data ? data : '');
    },
    error: (message: string, error?: any) => {
      console.error(`${prefix} ERROR: ${message}`, error ? error : '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`${prefix} WARN: ${message}`, data ? data : '');
    },
    debug: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${prefix} DEBUG: ${message}`, data ? data : '');
      }
    }
  };
}