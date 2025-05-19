/**
 * Replicate Agent Implementation
 * 
 * Provides specific implementation for integration with Replicate's API 
 * for a variety of open source models.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseAgent } from './BaseAgent';
import { Agent } from '@shared/schema';
import { log } from '../utils/logger';
import { storage } from '../storage';
import { createDiff } from '../utils/fileDiff';

export class ReplicateAgent extends BaseAgent {
  private apiKey: string | null = null;
  private model: string;
  private modelVersion: string;
  
  /**
   * Create a new Replicate agent instance
   * @param agent Agent data from database
   */
  constructor(agent: Agent) {
    super(agent);
    
    // Extract Replicate-specific config
    this.model = 'unknown';
    this.modelVersion = 'latest';
    
    if (this.metadata) {
      this.apiKey = this.metadata.apiKey || process.env.REPLICATE_API_KEY || null;
      this.model = this.metadata.model || 'meta/codellama';
      this.modelVersion = this.metadata.modelVersion || '34b';
    }
  }
  
  /**
   * Get the model being used
   */
  public getModel(): string {
    return `${this.model}:${this.modelVersion}`;
  }
  
  /**
   * Check if the agent has API credentials
   */
  public hasCredentials(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Submit a change
   * @param filePath File path to change
   * @param content New content
   * @returns Change ID if successful, null if failed
   */
  public async submitChange(
    filePath: string, 
    content: string
  ): Promise<number | null> {
    try {
      log('info', 'agent', `Replicate agent submitting change: ${filePath}`, { agentId: this.agentId });
      
      // First check permissions
      if (!this.canEditFile(filePath)) {
        log('warning', 'agent', `Replicate agent lacks permission to edit file: ${filePath}`, {
          agentId: this.agentId,
          filePath
        });
        
        return null;
      }
      
      // Check if file is locked
      const fileCheck = await this.checkFile(filePath, content);
      
      if (fileCheck.isLocked) {
        log('warning', 'agent', `Replicate agent tried to edit locked file: ${filePath}`, {
          agentId: this.agentId,
          filePath
        });
        
        return null;
      }
      
      // Get the original content of the file
      let originalContent = "";
      const fullPath = path.resolve('project', filePath);
      
      if (await fs.pathExists(fullPath)) {
        originalContent = await fs.readFile(fullPath, 'utf-8');
      }
      
      // Create a unified diff
      const diffContent = createDiff(filePath, originalContent, content);
      
      // Create change record
      const change = await storage.createChange({
        agentId: this.agentId,
        filePath,
        diffContent,
        originalContent,
        status: 'pending',
        metadata: {
          agent: this.name,
          model: this.getModel(),
          timestamp: new Date().toISOString()
        }
      });
      
      // Update last activity
      await this.updateLastActivity();
      
      log('info', 'agent', `Replicate agent successfully submitted change: ${filePath}`, {
        agentId: this.agentId,
        changeId: change.id
      });
      
      return change.id;
    } catch (error) {
      log('error', 'agent', `Replicate agent failed to submit change: ${filePath}`, {
        error,
        agentId: this.agentId,
        filePath
      });
      
      return null;
    }
  }
}