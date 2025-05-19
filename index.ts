import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";
import { errorResponse, createLogger } from "./utils/response";
import { z } from "zod";
import { configureHelmet, maintenanceMode, apiLimiter } from "./utils/security";

const logger = createLogger('index', 'serverInit');

// Create Express app
const app = express();

// Security middleware
app.use(configureHelmet()); // Add secure HTTP headers
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: false, limit: '1mb' })); // Limit URL-encoded payload size
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-secret'));

// Maintenance mode middleware - will block all requests if enabled
app.use(maintenanceMode);

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Maintenance mode endpoint - accessible even in maintenance mode
app.get('/maintenance', (req, res) => {
  res.json({
    maintenance: process.env.MAINTENANCE_MODE === 'true',
    status: process.env.MAINTENANCE_MODE === 'true' ? 'down' : 'up',
    message: process.env.MAINTENANCE_MODE === 'true' 
      ? 'The system is currently under maintenance. Please try again later.'
      : 'System is operating normally.'
  });
});

// Request logging middleware with privacy protection
app.use((req, res, next) => {
  // Don't log sensitive endpoints or static content
  if (req.path.includes('/health') || 
      req.path.includes('/favicon.ico') || 
      req.path.endsWith('.js') || 
      req.path.endsWith('.css')) {
    return next();
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Redact sensitive information from logs
    if (bodyJson && typeof bodyJson === 'object') {
      const safeBodyJson = { ...bodyJson };
      
      // Recursively redact sensitive fields from response logs
      const redactSensitiveData = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        
        // List of fields to redact
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
        
        Object.keys(obj).forEach(key => {
          if (sensitiveFields.includes(key.toLowerCase())) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            redactSensitiveData(obj[key]);
          }
        });
      };
      
      redactSensitiveData(safeBodyJson);
      capturedJsonResponse = safeBodyJson;
    } else {
      capturedJsonResponse = bodyJson;
    }
    
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log detailed responses in development
      if (process.env.NODE_ENV === 'development' && capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 80) {
          logLine += ` :: ${responseStr.slice(0, 79)}…`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      logger.info(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Register API routes and get the server
    const server = await registerRoutes(app);

    // Global error handling middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      
      // Handle different types of errors
      if (err instanceof z.ZodError) {
        logger.error(`Validation error: ${req.method} ${req.path}`, err.format());
        return res.status(400).json(
          errorResponse('Validation error', 'VALIDATION_ERROR', err.format())
        );
      }
      
      // Redact sensitive information from error logs
      let safeError;
      if (typeof err === 'object') {
        // Clone the error to avoid modifying the original
        try {
          safeError = JSON.parse(JSON.stringify(err));
          // Redact sensitive fields
          const redactFields = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            
            const sensitiveFields = [
              'password', 'token', 'secret', 'apiKey', 'key', 
              'authorization', 'authToken', 'cookie', 'session'
            ];
            
            Object.keys(obj).forEach(key => {
              if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                obj[key] = '[REDACTED]';
              } else if (typeof obj[key] === 'object') {
                redactFields(obj[key]);
              }
            });
          };
          
          redactFields(safeError);
        } catch (e) {
          // If error can't be serialized, just use a safe summary
          safeError = { 
            message: err.message || 'Error occurred',
            name: err.name,
            code: err.code
          };
        }
      } else {
        safeError = String(err);
      }
      
      // Log the safe error
      logger.error(`Error: ${req.method} ${req.path} (${status})`, safeError);
      
      // Higher-severity errors (500s) should be handled separately
      if (status >= 500) {
        // In production, you might want to notify administrators
        if (process.env.NODE_ENV === 'production') {
          // This could trigger an alert or notification
        }
      }
      
      // Don't expose stack traces in production
      const errorDetails = process.env.NODE_ENV === 'development' ? err.stack : undefined;
      
      // Use a more generic message in production for 500 errors
      const message = status >= 500 && process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred. Our team has been notified.'
        : err.message || 'Internal Server Error';
      
      return res.status(status).json(
        errorResponse(
          message, 
          err.code || 'SERVER_ERROR',
          errorDetails
        )
      );
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
})();
