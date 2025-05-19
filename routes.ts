import type { Express } from "express";
import { createServer, type Server } from "http";
import { createLogger } from "./utils/response";
import * as usersController from "./controllers/users.controller";
import * as projectsController from "./controllers/projects.controller";
import * as chatController from "./controllers/chat.controller";
import { serveStatic, setupVite } from "./vite";
import { authLimiter, aiChatLimiter } from "./utils/security";

const logger = createLogger('routes', 'registerRoutes');

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes - apply stricter rate limiting for auth endpoints
  app.post("/api/users", authLimiter, usersController.createUser);
  app.get("/api/users/:id", usersController.getUserById);
  app.post("/api/login", authLimiter, usersController.loginUser);
  app.post("/api/logout", usersController.logoutUser);

  // Project routes
  app.post("/api/projects", projectsController.createProject);
  app.get("/api/projects/:id", projectsController.getProjectById);
  app.get("/api/projects/user/:userId", projectsController.getProjectsByUserId);
  app.put("/api/projects/:id", projectsController.updateProject);
  
  // Chat message routes - rate limit AI interactions to prevent abuse
  app.post("/api/messages", chatController.createChatMessage);
  app.get("/api/messages/user/:userId", chatController.getChatMessagesByUserId);
  app.get("/api/messages/project/:projectId", chatController.getChatMessagesByProjectId);
  
  // AI endpoint - apply stricter rate limiting to prevent abuse
  app.post("/api/chat", aiChatLimiter, chatController.sendPromptToAI);
  
  logger.info('API routes registered successfully');

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Set up Vite in development mode
  if (process.env.NODE_ENV === "development") {
    logger.info("Using vite dev server");
    await setupVite(app, httpServer);
  } else {
    logger.info("Using static files");
    serveStatic(app);
  }
  
  return httpServer;
}
