/**
 * File Locking Utilities
 * 
 * Provides functionality for checking and managing file locks
 * to prevent concurrent edits.
 */
import * as path from 'path';
import { log } from './logger';
import { storage } from '../storage';

/**
 * Check if a file is locked
 * @param filePath Path to check
 * @returns Lock information if locked, null if not locked
 */
export async function checkLocks(filePath: string): Promise<any | null> {
  try {
    // Normalize path
    const normalizedPath = path.normalize(filePath);
    
    // Get all locks
    const locks = await storage.getLocks();
    
    // Check for direct file lock
    const directLock = locks.find(lock => 
      path.normalize(lock.filePath) === normalizedPath
    );
    
    if (directLock) {
      log('info', 'locks', `File ${filePath} is directly locked`, { lock: directLock });
      return directLock;
    }
    
    // Check for pattern locks (e.g. directory locks)
    for (const lock of locks) {
      if (lock.pattern) {
        try {
          const regex = new RegExp(lock.pattern);
          
          if (regex.test(normalizedPath)) {
            log('info', 'locks', `File ${filePath} matches lock pattern ${lock.pattern}`, { lock });
            return lock;
          }
        } catch (error) {
          log('error', 'locks', `Invalid lock pattern: ${lock.pattern}`, { error });
        }
      }
    }
    
    // No locks found
    return null;
  } catch (error) {
    log('error', 'locks', `Error checking locks for ${filePath}`, { error });
    return null;
  }
}

/**
 * Create a file lock
 * @param filePath File path to lock
 * @param pattern Optional pattern to lock (e.g. directory)
 * @param metadata Optional metadata
 * @returns Created lock or null if failed
 */
export async function createLock(
  filePath: string, 
  pattern: string | null = null,
  metadata: Record<string, any> = {}
): Promise<any | null> {
  try {
    // First check if already locked
    const existingLock = await checkLocks(filePath);
    
    if (existingLock) {
      log('warning', 'locks', `Failed to create lock: ${filePath} is already locked`, { 
        existingLock 
      });
      return null;
    }
    
    // Create lock
    const lock = await storage.createLock({
      filePath,
      pattern
    });
    
    log('info', 'locks', `Created lock for ${filePath}`, { lock });
    
    return lock;
  } catch (error) {
    log('error', 'locks', `Error creating lock for ${filePath}`, { error });
    return null;
  }
}

/**
 * Release a file lock
 * @param lockId Lock ID to release
 * @returns Whether the lock was released
 */
export async function releaseLock(lockId: number): Promise<boolean> {
  try {
    const success = await storage.deleteLock(lockId);
    
    if (success) {
      log('info', 'locks', `Released lock ${lockId}`);
    } else {
      log('warning', 'locks', `Failed to release lock ${lockId}`);
    }
    
    return success;
  } catch (error) {
    log('error', 'locks', `Error releasing lock ${lockId}`, { error });
    return false;
  }
}

/**
 * Check if multiple files are locked
 * @param filePaths Array of file paths to check
 * @returns Map of locked files to their lock information
 */
export async function checkMultipleLocks(
  filePaths: string[]
): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  
  // Check each file
  for (const filePath of filePaths) {
    const lock = await checkLocks(filePath);
    
    if (lock) {
      result.set(filePath, lock);
    }
  }
  
  return result;
}