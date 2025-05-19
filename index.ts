/**
 * Agent Registry and Factory
 * 
 * Provides factory functions for creating agent instances based on
 * agent type and managing registration.
 */
import { Agent } from '@shared/schema';
import { BaseAgent } from './BaseAgent';
import { GPTAgent } from './GPTAgent';
import { ClaudeAgent } from './ClaudeAgent';
import { ReplicateAgent } from './ReplicateAgent';
import { log } from '../utils/logger';
import { storage } from '../storage';

/**
 * Create an instance of the appropriate agent class based on agent type
 * @param agentId Agent identifier
 * @returns Instance of BaseAgent or null if agent not found
 */
export async function getAgentInstance(agentId: string): Promise<BaseAgent | null> {
  try {
    // Get agent data from storage
    const agent = await storage.getAgentByAgentId(agentId);
    
    if (!agent) {
      log('warning', 'agent', `Agent not found: ${agentId}`);
      return null;
    }
    
    // Create instance based on type
    switch (agent.type.toLowerCase()) {
      case 'gpt':
      case 'openai':
        return new GPTAgent(agent);
        
      case 'claude':
      case 'anthropic':
        return new ClaudeAgent(agent);
        
      case 'replicate':
        return new ReplicateAgent(agent);
        
      default:
        log('warning', 'agent', `Unknown agent type: ${agent.type}`, { agentId });
        
        // Default to GPT agent
        return new GPTAgent(agent);
    }
  } catch (error) {
    log('error', 'agent', `Failed to create agent instance: ${agentId}`, { error });
    return null;
  }
}

/**
 * Get all active agents
 * @returns Array of agent instances
 */
export async function getAllActiveAgents(): Promise<BaseAgent[]> {
  try {
    // Get all agents from storage
    const agents = await storage.getAgents();
    
    // Filter for active agents
    const activeAgents = agents.filter(agent => agent.status === 'active');
    
    // Create instances for each active agent
    const instances: BaseAgent[] = [];
    
    for (const agent of activeAgents) {
      try {
        switch (agent.type.toLowerCase()) {
          case 'gpt':
          case 'openai':
            instances.push(new GPTAgent(agent));
            break;
            
          case 'claude':
          case 'anthropic':
            instances.push(new ClaudeAgent(agent));
            break;
            
          case 'replicate':
            instances.push(new ReplicateAgent(agent));
            break;
            
          default:
            // Skip unknown agent types
            break;
        }
      } catch (error) {
        log('error', 'agent', `Failed to create agent instance: ${agent.agentId}`, { error });
      }
    }
    
    return instances;
  } catch (error) {
    log('error', 'agent', 'Failed to get all active agents', { error });
    return [];
  }
}