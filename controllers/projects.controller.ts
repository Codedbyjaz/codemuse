import { Request, Response } from 'express';
import { storage } from '../storage';
import { successResponse, errorResponse, createLogger } from '../utils/response';
import { insertProjectSchema } from '@shared/schema';

const logger = createLogger('projects.controller', 'ProjectsController');

/**
 * Get project by ID
 */
export async function getProjectById(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json(
        errorResponse('Invalid project ID', 'INVALID_INPUT')
      );
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json(
        errorResponse('Project not found', 'PROJECT_NOT_FOUND')
      );
    }
    
    return res.json(
      successResponse('Project retrieved successfully', project)
    );
  } catch (error) {
    logger.error('Failed to retrieve project', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Get projects by user ID
 */
export async function getProjectsByUserId(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json(
        errorResponse('Invalid user ID', 'INVALID_INPUT')
      );
    }
    
    const projects = await storage.getProjectsByUser(userId);
    
    return res.json(
      successResponse('Projects retrieved successfully', projects)
    );
  } catch (error) {
    logger.error('Failed to retrieve user projects', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Create a new project
 */
export async function createProject(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = insertProjectSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json(
        errorResponse(
          'Invalid project data', 
          'VALIDATION_ERROR',
          validationResult.error.format()
        )
      );
    }
    
    const projectData = validationResult.data;
    
    // Create the project
    const newProject = await storage.createProject(projectData);
    
    return res.status(201).json(
      successResponse('Project created successfully', newProject)
    );
  } catch (error) {
    logger.error('Failed to create project', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Update a project
 */
export async function updateProject(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json(
        errorResponse('Invalid project ID', 'INVALID_INPUT')
      );
    }
    
    // Check if project exists
    const existingProject = await storage.getProject(projectId);
    
    if (!existingProject) {
      return res.status(404).json(
        errorResponse('Project not found', 'PROJECT_NOT_FOUND')
      );
    }
    
    // Allow partial updates
    const allowedFields = ['name', 'description', 'htmlCode', 'cssCode', 'jsCode'];
    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(
        errorResponse('No valid fields to update', 'INVALID_UPDATE')
      );
    }
    
    // Update the project
    const updatedProject = await storage.updateProject(projectId, updateData);
    
    return res.json(
      successResponse('Project updated successfully', updatedProject)
    );
  } catch (error) {
    logger.error('Failed to update project', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}