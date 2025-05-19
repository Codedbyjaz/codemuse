/**
 * Base Agent
 * 
 * Abstract base class for all agent implementations that provides
 * common functionality and defines the required interface.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { log } from '../utils/logger';
import { hasFileChanged } from '../utils/fingerprint';
import { checkLocks } from '../utils/checkLocks';
import { storage } from '../storage';
import { createDiff } from '../utils/fileDiff';
import { generateFingerprint } from '../utils/fingerprint';
import { PROJECT_PATH } from '../config';

/**
 * Base agent configuration
 */
export interface BaseAgentConfig {
  id: string;
  name: string;
  type: string;
  allowedExtensions?: string[];
  allowedDirectories?: string[];
  excludedPatterns?: string[];
  maxChanges?: number;
  metadata?: Record<string, any>;
}

/**
 * Edit request
 */
export interface EditRequest {
  filePath: string;
  content: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Base agent class
 */
export abstract class BaseAgent {
  protected config: BaseAgentConfig;
  protected initialized: boolean = false;
  
  /**
   * Create a new agent
   * @param config Agent configuration
   */
  constructor(config: BaseAgentConfig) {
    this.config = {
      ...config,
      maxChanges: config.maxChanges || 100
    };
  }
  
  /**
   * Initialize the agent
   * Typically registers the agent in the database
   */
  public async initialize(): Promise<boolean> {
    try {
      const existingAgent = await storage.getAgentByAgentId(this.config.id);
      
      if (existingAgent) {
        // Update existing agent
        await storage.updateAgent(existingAgent.id, {
          name: this.config.name,
          type: this.config.type,
          metadata: this.config.metadata || {}
        });
        
        log('info', 'agent', `Updated agent: ${this.config.id}`);
      } else {
        // Create new agent
        await storage.createAgent({
          agentId: this.config.id,
          name: this.config.name,
          type: this.config.type,
          status: 'active',
          metadata: this.config.metadata || {}
        });
        
        log('info', 'agent', `Registered new agent: ${this.config.id}`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      log('error', 'agent', `Failed to initialize agent: ${this.config.id}`, { error });
      return false;
    }
  }
  
  /**
   * Check if a file can be edited
   * @param filePath File path
   * @returns True if file can be edited, false otherwise
   */
  public async canEditFile(filePath: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        log('error', 'agent', `Agent not initialized: ${this.config.id}`);
        return false;
      }
      
      // Check if file exists
      const fullPath = path.join(PROJECT_PATH, filePath);
      if (!await fs.pathExists(fullPath)) {
        log('warning', 'agent', `File does not exist: ${filePath}`);
        return false;
      }
      
      // Check if file is locked
      const lock = await checkLocks(filePath);
      if (lock) {
        log('warning', 'agent', `File is locked: ${filePath}`, { lock });
        return false;
      }
      
      // Check if extension is allowed
      if (this.config.allowedExtensions && this.config.allowedExtensions.length > 0) {
        const ext = path.extname(filePath);
        if (!this.config.allowedExtensions.includes(ext)) {
          log('warning', 'agent', `File extension not allowed: ${ext}`);
          return false;
        }
      }
      
      // Check if directory is allowed
      if (this.config.allowedDirectories && this.config.allowedDirectories.length > 0) {
        const dir = path.dirname(filePath);
        const allowed = this.config.allowedDirectories.some(allowedDir => 
          dir === allowedDir || dir.startsWith(`${allowedDir}/`)
        );
        
        if (!allowed) {
          log('warning', 'agent', `Directory not allowed: ${dir}`);
          return false;
        }
      }
      
      // Check if pattern is excluded
      if (this.config.excludedPatterns && this.config.excludedPatterns.length > 0) {
        for (const pattern of this.config.excludedPatterns) {
          try {
            const regex = new RegExp(pattern);
            if (regex.test(filePath)) {
              log('warning', 'agent', `File matches excluded pattern: ${pattern}`);
              return false;
            }
          } catch (error) {
            log('error', 'agent', `Invalid excluded pattern: ${pattern}`, { error });
          }
        }
      }
      
      // Check if agent has reached maximum changes
      const pendingChanges = await storage.getChanges({ 
        agentId: this.config.id, 
        status: 'pending' 
      });
      
      if (pendingChanges.length >= this.config.maxChanges) {
        log('warning', 'agent', `Agent has reached maximum pending changes: ${pendingChanges.length}`);
        return false;
      }
      
      return true;
    } catch (error) {
      log('error', 'agent', `Error checking if file can be edited: ${filePath}`, { error });
      return false;
    }
  }
  
  /**
   * Request a file edit
   * @param request Edit request
   * @returns Change ID if successful, null otherwise
   */
  public async requestEdit(request: EditRequest): Promise<number | null> {
    try {
      if (!this.initialized) {
        log('error', 'agent', `Agent not initialized: ${this.config.id}`);
        return null;
      }
      
      // Check if file can be edited
      if (!await this.canEditFile(request.filePath)) {
        log('warning', 'agent', `Cannot edit file: ${request.filePath}`);
        return null;
      }
      
      const fullPath = path.join(PROJECT_PATH, request.filePath);
      
      // Read original content if file exists
      let originalContent: string | null = null;
      if (await fs.pathExists(fullPath)) {
        originalContent = await fs.readFile(fullPath, 'utf-8');
      }
      
      // Create diff if original content exists
      let diffContent: string;
      if (originalContent !== null) {
        diffContent = createDiff(request.filePath, originalContent, request.content);
      } else {
        // If file doesn't exist, use empty string as original
        diffContent = createDiff(request.filePath, '', request.content);
        originalContent = '';
      }
      
      // Create the change
      const change = await storage.createChange({
        agentId: this.config.id,
        filePath: request.filePath,
        diffContent,
        originalContent,
        status: 'pending',
        metadata: request.metadata || {}
      });
      
      log('info', 'agent', `Created change request: ${change.id}`, {
        filePath: request.filePath,
        agentId: this.config.id
      });
      
      return change.id;
    } catch (error) {
      log('error', 'agent', `Failed to request edit: ${request.filePath}`, { error });
      return null;
    }
  }
  
  /**
   * Get pending changes for this agent
   * @returns Array of pending changes
   */
  public async getPendingChanges(): Promise<any[]> {
    try {
      if (!this.initialized) {
        log('error', 'agent', `Agent not initialized: ${this.config.id}`);
        return [];
      }
      
      return await storage.getChanges({ 
        agentId: this.config.id, 
        status: 'pending' 
      });
    } catch (error) {
      log('error', 'agent', `Failed to get pending changes for ${this.config.id}`, { error });
      return [];
    }
  }
  
  /**
   * Check if a file has changed since last access
   * @param filePath File path
   * @returns Whether the file has changed
   */
  public async hasFileChanged(filePath: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        log('error', 'agent', `Agent not initialized: ${this.config.id}`);
        return false;
      }
      
      const fullPath = path.join(PROJECT_PATH, filePath);
      return await hasFileChanged(fullPath);
    } catch (error) {
      log('error', 'agent', `Failed to check if file has changed: ${filePath}`, { error });
      return true; // Consider changed on error to be safe
    }
  }
  
  /**
   * Process a file and return its content
   * @param filePath File path
   * @returns File content or null if not available
   */
  public async getFileContent(filePath: string): Promise<string | null> {
    try {
      if (!this.initialized) {
        log('error', 'agent', `Agent not initialized: ${this.config.id}`);
        return null;
      }
      
      const fullPath = path.join(PROJECT_PATH, filePath);
      
      if (!await fs.pathExists(fullPath)) {
        log('warning', 'agent', `File does not exist: ${filePath}`);
        return null;
      }
      
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      log('error', 'agent', `Failed to read file: ${filePath}`, { error });
      return null;
    }
  }
  
  /**
   * Get agent ID
   * @returns Agent ID
   */
  public getAgentId(): string {
    return this.config.id;
  }
  
  /**
   * Get agent name
   * @returns Agent name
   */
  public getName(): string {
    return this.config.name;
  }
  
  /**
   * Get agent type
   * @returns Agent type
   */
  public getType(): string {
    return this.config.type;
  }
  
  /**
   * Get agent configuration
   * @returns Agent configuration
   */
  public getConfig(): BaseAgentConfig {
    return { ...this.config };
  }
  
  /**
   * Process a message. Each agent should implement this method.
   * @param message Message to process
   * @returns Response message
   */
  public abstract processMessage(message: any): Promise<any>;
}