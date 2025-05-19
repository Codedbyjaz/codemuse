/**
 * Claude Agent Implementation
 * 
 * Provides specific implementation for Claude-based AI agents with
 * Anthropic integration capabilities.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseAgent } from './BaseAgent';
import { Agent } from '@shared/schema';
import { log } from '../utils/logger';
import { storage } from '../storage';
import { createDiff } from '../utils/fileDiff';

export class ClaudeAgent extends BaseAgent {
  private apiKey: string | null = null;
  private model: string = 'claude-3-opus';
  
  /**
   * Create a new Claude agent instance
   * @param agent Agent data from database
   */
  constructor(agent: Agent) {
    super(agent);
    
    // Extract Claude-specific config
    if (this.metadata) {
      this.apiKey = this.metadata.apiKey || process.env.ANTHROPIC_API_KEY || null;
      this.model = this.metadata.model || 'claude-3-opus';
    }
  }
  
  /**
   * Get the Anthropic model being used
   */
  public getModel(): string {
    return this.model;
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
      log('info', 'agent', `Claude agent submitting change: ${filePath}`, { agentId: this.agentId });
      
      // First check permissions
      if (!this.canEditFile(filePath)) {
        log('warning', 'agent', `Claude agent lacks permission to edit file: ${filePath}`, {
          agentId: this.agentId,
          filePath
        });
        
        return null;
      }
      
      // Check if file is locked
      const fileCheck = await this.checkFile(filePath, content);
      
      if (fileCheck.isLocked) {
        log('warning', 'agent', `Claude agent tried to edit locked file: ${filePath}`, {
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
          model: this.model,
          timestamp: new Date().toISOString()
        }
      });
      
      // Update last activity
      await this.updateLastActivity();
      
      log('info', 'agent', `Claude agent successfully submitted change: ${filePath}`, {
        agentId: this.agentId,
        changeId: change.id
      });
      
      return change.id;
    } catch (error) {
      log('error', 'agent', `Claude agent failed to submit change: ${filePath}`, {
        error,
        agentId: this.agentId,
        filePath
      });
      
      return null;
    }
  }
}