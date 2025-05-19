import { Request, Response } from 'express';
import { storage } from '../storage';
import { successResponse, errorResponse, createLogger } from '../utils/response';
import { insertChatMessageSchema } from '@shared/schema';

const logger = createLogger('chat.controller', 'ChatController');

/**
 * Get chat messages by user ID
 */
export async function getChatMessagesByUserId(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json(
        errorResponse('Invalid user ID', 'INVALID_INPUT')
      );
    }
    
    const messages = await storage.getChatMessagesByUser(userId);
    
    return res.json(
      successResponse('Chat messages retrieved successfully', messages)
    );
  } catch (error) {
    logger.error('Failed to retrieve user chat messages', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Get chat messages by project ID
 */
export async function getChatMessagesByProjectId(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json(
        errorResponse('Invalid project ID', 'INVALID_INPUT')
      );
    }
    
    const messages = await storage.getChatMessagesByProject(projectId);
    
    return res.json(
      successResponse('Chat messages retrieved successfully', messages)
    );
  } catch (error) {
    logger.error('Failed to retrieve project chat messages', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Create a new chat message
 */
export async function createChatMessage(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = insertChatMessageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json(
        errorResponse(
          'Invalid chat message data', 
          'VALIDATION_ERROR',
          validationResult.error.format()
        )
      );
    }
    
    const messageData = validationResult.data;
    
    // Create the chat message
    const newMessage = await storage.createChatMessage(messageData);
    
    return res.status(201).json(
      successResponse('Chat message created successfully', newMessage)
    );
  } catch (error) {
    logger.error('Failed to create chat message', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Send a prompt to the AI assistant
 */
export async function sendPromptToAI(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json(
        errorResponse('Valid prompt is required', 'INVALID_INPUT')
      );
    }
    
    // Simplified AI response logic for now
    // In a real implementation, this would integrate with an AI service
    const concepts = prompt.toLowerCase().includes('javascript') 
      ? ['Variables', 'Functions', 'DOM Manipulation'] 
      : prompt.toLowerCase().includes('css') 
        ? ['Selectors', 'Flexbox', 'Responsive Design']
        : ['HTML Structure', 'Semantic Elements'];
    
    const aiResponse = {
      reply: `I analyzed your code and found some key concepts to learn: ${concepts.join(', ')}. Let me explain how these work in your code...`,
      concepts
    };
    
    return res.json(
      successResponse('AI response generated', aiResponse)
    );
  } catch (error) {
    logger.error('Failed to generate AI response', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}