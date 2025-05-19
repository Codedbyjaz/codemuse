import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { insertChangeSchema } from "@shared/schema";
import { initWebSocketManager } from "./utils/websocketManager";
import { log } from "./utils/logger";
import { BaseAgent } from "./agents/BaseAgent";
import { getAgentInstance } from "./agents";
import { checkLocks } from "./utils/checkLocks";
import { trackAgentRequest, isRateLimited } from "./middleware/auth";
import { createDiff } from "./utils/fileDiff";
import { saveFingerprint, getFileFingerprint, generateFingerprint } from "./utils/fingerprint";
import { applyToSandbox, commitFromSandbox } from "./utils/sandboxCommit";
import config from "./config";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Agents API
  app.get("/api/agents", async (req: Request, res: Response) => {
    const agents = await storage.getAgents();
    res.json(agents);
  });
  
  app.get("/api/agents/:agentId", async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const agent = await storage.getAgentByAgentId(agentId);
    
    if (!agent) {
      return res.status(404).json({ message: `Agent ${agentId} not found` });
    }
    
    res.json(agent);
  });
  
  // Changes API
  app.get("/api/changes", async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const agentId = req.query.agentId as string | undefined;
    
    const changes = await storage.getChanges({ status, agentId });
    res.json(changes);
  });
  
  app.get("/api/changes/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid change ID" });
    }
    
    const change = await storage.getChange(id);
    
    if (!change) {
      return res.status(404).json({ message: `Change ${id} not found` });
    }
    
    res.json(change);
  });
  
  app.post("/api/changes/:id/approve", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid change ID" });
    }
    
    const change = await storage.getChange(id);
    
    if (!change) {
      return res.status(404).json({ message: `Change ${id} not found` });
    }
    
    if (change.status !== "pending") {
      return res.status(400).json({ message: `Change ${id} is not pending` });
    }
    
    try {
      // Apply the change to the sandbox first
      await applyToSandbox([{
        file: change.filePath,
        diff: change.diffContent,
        original: change.originalContent
      }]);
      
      // Commit to production
      await commitFromSandbox(
        change.id, 
        change.agentId, 
        req.body.approvedBy || 'admin', 
        [change.filePath]
      );
      
      // Update the change status
      const updatedChange = await storage.updateChange(id, { status: "approved" });
      
      // Update file fingerprint
      const productionPath = path.join(config.paths.project, change.filePath);
      const fileContent = await fs.readFile(productionPath, 'utf-8');
      const hash = generateFingerprint(fileContent);
      await saveFingerprint(change.filePath, hash);
      
      res.json(updatedChange);
    } catch (error) {
      res.status(500).json({ message: `Failed to approve change: ${(error as Error).message}` });
    }
  });
  
  app.post("/api/changes/:id/reject", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid change ID" });
    }
    
    const change = await storage.getChange(id);
    
    if (!change) {
      return res.status(404).json({ message: `Change ${id} not found` });
    }
    
    if (change.status !== "pending") {
      return res.status(400).json({ message: `Change ${id} is not pending` });
    }
    
    const updatedChange = await storage.updateChange(id, { status: "rejected" });
    res.json(updatedChange);
  });
  
  // Locks API
  app.get("/api/locks", async (req: Request, res: Response) => {
    const locks = await storage.getLocks();
    res.json(locks);
  });
  
  app.post("/api/locks", async (req: Request, res: Response) => {
    const lockSchema = z.object({
      filePath: z.string(),
      pattern: z.string().nullable().optional()
    });
    
    try {
      const data = lockSchema.parse(req.body);
      const lock = await storage.createLock(data);
      res.status(201).json(lock);
    } catch (error) {
      res.status(400).json({ message: `Invalid lock data: ${(error as Error).message}` });
    }
  });
  
  app.delete("/api/locks/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lock ID" });
    }
    
    const success = await storage.deleteLock(id);
    
    if (!success) {
      return res.status(404).json({ message: `Lock ${id} not found` });
    }
    
    res.status(204).send();
  });
  
  // System status
  app.get("/api/status", async (req: Request, res: Response) => {
    const agents = await storage.getAgents();
    const locks = await storage.getLocks();
    const pendingChanges = await storage.getChanges({ status: "pending" });
    const approvedChanges = await storage.getChanges({ status: "approved" });
    const rejectedChanges = await storage.getChanges({ status: "rejected" });
    
    res.json({
      agents: {
        total: agents.length,
        active: agents.filter(a => a.status === "active").length
      },
      changes: {
        pending: pendingChanges.length,
        approved: approvedChanges.length,
        rejected: rejectedChanges.length
      },
      locks: locks.length
    });
  });
  
  // Sync API - The main endpoint for agent-driven changes
  app.post("/api/sync", async (req: Request, res: Response) => {
    const syncSchema = z.object({
      agentId: z.string(),
      filePath: z.string(),
      content: z.string(),
    });
    
    try {
      const { agentId, filePath, content } = syncSchema.parse(req.body);
      
      // Check if agent exists
      const agent = await storage.getAgentByAgentId(agentId);
      if (!agent) {
        return res.status(404).json({ message: `Agent ${agentId} not found` });
      }
      
      // Check if agent is active
      if (agent.status !== "active") {
        return res.status(403).json({ message: `Agent ${agentId} is not active` });
      }
      
      // Track and check rate limiting
      await trackAgentRequest(agentId);
      if (await isRateLimited(agentId)) {
        return res.status(429).json({ message: `Rate limit exceeded for agent ${agentId}` });
      }
      
      // Get agent instance and permissions
      const agentInstance = await getAgentInstance(agentId);
      
      // Check agent's file editing permissions
      if (!agentInstance || !agentInstance.canEditFile(filePath)) {
        return res.status(403).json({ 
          message: `Agent ${agentId} does not have permission to edit ${filePath}` 
        });
      }
      
      // Check if file is locked
      try {
        const lockInfo = await checkLocks(filePath);
        if (lockInfo) {
          return res.status(403).json({ message: `File ${filePath} is locked or contains locked patterns`, lock: lockInfo });
        }
      } catch (error) {
        return res.status(500).json({ message: `Failed to check locks: ${(error as Error).message}` });
      }
      
      // Check if file exists and get original content
      let originalContent = "";
      try {
        // Get original content from production path
        const productionPath = path.resolve("project", filePath);
        if (await fs.pathExists(productionPath)) {
          originalContent = await fs.readFile(productionPath, "utf-8");
        }
      } catch (error) {
        return res.status(500).json({ 
          message: `Failed to read original file: ${(error as Error).message}` 
        });
      }
      
      // Create diff
      const diffContent = createDiff(filePath, originalContent, content);
      
      // Create change record
      const change = await storage.createChange({
        agentId,
        filePath,
        diffContent,
        originalContent,
        status: "pending",
        metadata: { 
          agent: agent.name,
          timestamp: new Date().toISOString()
        }
      });
      
      res.status(201).json(change);
    } catch (error) {
      res.status(400).json({ message: `Invalid sync data: ${(error as Error).message}` });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket manager with advanced features
  const wsManager = initWebSocketManager(httpServer, '/ws');
  
  // Broadcast changes to connected clients using the manager
  const broadcastChanges = async () => {
    const pendingChanges = await storage.getChanges({ status: "pending" });
    wsManager.broadcastChangesUpdate(pendingChanges);
  };
  
  // Setup a hook to broadcast changes when they're created/updated
  const originalCreateChange = storage.createChange;
  const originalUpdateChange = storage.updateChange;
  
  storage.createChange = async (change) => {
    const result = await originalCreateChange.call(storage, change);
    await broadcastChanges();
    return result;
  };
  
  storage.updateChange = async (id, change) => {
    const result = await originalUpdateChange.call(storage, id, change);
    await broadcastChanges();
    return result;
  };

  return httpServer;
}
