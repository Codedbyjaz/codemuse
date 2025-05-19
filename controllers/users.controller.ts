import { Request, Response } from 'express';
import { storage } from '../storage';
import { successResponse, errorResponse, createLogger } from '../utils/response';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword, comparePassword, setSecureCookie, logSecurityEvent } from '../utils/security';

const logger = createLogger('users.controller', 'UsersController');

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json(
        errorResponse('Invalid user ID', 'INVALID_INPUT')
      );
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('User not found', 'USER_NOT_FOUND')
      );
    }
    
    // Don't return the password in the response
    const { password, ...userWithoutPassword } = user;
    
    return res.json(
      successResponse('User retrieved successfully', userWithoutPassword)
    );
  } catch (error) {
    logger.error('Failed to retrieve user', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Create a new user
 */
export async function createUser(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = insertUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json(
        errorResponse(
          'Invalid user data', 
          'VALIDATION_ERROR',
          validationResult.error.format()
        )
      );
    }
    
    const userData = validationResult.data;
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    
    if (existingUser) {
      return res.status(409).json(
        errorResponse('Username already exists', 'USERNAME_TAKEN')
      );
    }
    
    // Hash the password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    // Create the user with hashed password
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword
    });
    
    // Don't return the password in the response
    const { password, ...userWithoutPassword } = newUser;
    
    // Set secure session cookie
    const sessionToken = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');
    setSecureCookie(res, 'user_session', sessionToken);
    
    return res.status(201).json(
      successResponse('User created successfully', userWithoutPassword)
    );
  } catch (error) {
    logger.error('Failed to create user', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Authenticate user login
 */
export async function loginUser(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json(
        errorResponse('Username and password are required', 'MISSING_CREDENTIALS')
      );
    }
    
    const user = await storage.getUserByUsername(username);
    
    // Use a consistent response for invalid credentials to prevent username enumeration
    if (!user) {
      logSecurityEvent('FAILED_LOGIN_ATTEMPT', { username, ip: req.ip }, 'low');
      return res.status(401).json(
        errorResponse('Invalid username or password', 'INVALID_CREDENTIALS')
      );
    }
    
    // Compare the password with the stored hash
    const passwordMatch = await comparePassword(password, user.password);
    
    if (!passwordMatch) {
      // Log failed login attempts
      logSecurityEvent('FAILED_LOGIN_ATTEMPT', { 
        username, 
        userId: user.id,
        ip: req.ip 
      }, 'medium');
      
      return res.status(401).json(
        errorResponse('Invalid username or password', 'INVALID_CREDENTIALS')
      );
    }
    
    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = user;
    
    // Set secure session cookie
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    setSecureCookie(res, 'user_session', sessionToken);
    
    return res.json(
      successResponse('Login successful', userWithoutPassword)
    );
  } catch (error) {
    logger.error('Failed to login user', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}

/**
 * Logout user
 */
export async function logoutUser(req: Request, res: Response) {
  try {
    // Clear the session cookie
    res.clearCookie('user_session');
    
    return res.json(
      successResponse('Logout successful')
    );
  } catch (error) {
    logger.error('Failed to logout user', error);
    return res.status(500).json(
      errorResponse('Internal server error', 'SERVER_ERROR')
    );
  }
}