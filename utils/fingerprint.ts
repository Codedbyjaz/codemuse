/**
 * Fingerprint Utilities
 * 
 * Provides functionality for generating and checking file fingerprints
 * to track changes and detect conflicts.
 */
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { log } from './logger';
import { storage } from '../storage';

/**
 * Generate a fingerprint for file content
 * @param content File content
 * @returns SHA-256 hash
 */
export function generateFingerprint(content: string): string {
  try {
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    log('error', 'fingerprint', 'Failed to generate fingerprint', { error });
    throw new Error(`Failed to generate fingerprint: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fingerprint for a file
 * @param filePath Path to file
 * @returns Fingerprint if successful, null otherwise
 */
export async function getFileFingerprint(filePath: string): Promise<string | null> {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      log('warning', 'fingerprint', `File not found: ${filePath}`);
      return null;
    }
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Generate fingerprint
    return generateFingerprint(content);
  } catch (error) {
    log('error', 'fingerprint', `Failed to get fingerprint for ${filePath}`, { error });
    return null;
  }
}

/**
 * Check if a file exists and has a specific fingerprint
 * @param filePath Path to file
 * @param expectedFingerprint Expected fingerprint
 * @returns Whether the file exists and has the expected fingerprint
 */
export async function checkFingerprint(
  filePath: string,
  expectedFingerprint: string
): Promise<boolean> {
  try {
    const actualFingerprint = await getFileFingerprint(filePath);
    
    if (!actualFingerprint) {
      return false;
    }
    
    return actualFingerprint === expectedFingerprint;
  } catch (error) {
    log('error', 'fingerprint', `Failed to check fingerprint for ${filePath}`, { error });
    return false;
  }
}

/**
 * Save a fingerprint to the database
 * @param filePath File path
 * @param hash Fingerprint hash
 * @returns Saved fingerprint record or null if failed
 */
export async function saveFingerprint(
  filePath: string,
  hash: string
): Promise<any | null> {
  try {
    // Check if fingerprint already exists
    const existing = await storage.getFingerprintByFilePath(filePath);
    
    if (existing) {
      // Update existing fingerprint
      const updated = await storage.updateFingerprint(existing.id, {
        hash,
        lastModified: new Date()
      });
      
      log('info', 'fingerprint', `Updated fingerprint for ${filePath}`, {
        hash,
        id: existing.id
      });
      
      return updated;
    } else {
      // Create new fingerprint
      const created = await storage.createFingerprint({
        filePath,
        hash,
        lastModified: new Date()
      });
      
      log('info', 'fingerprint', `Created fingerprint for ${filePath}`, {
        hash,
        id: created.id
      });
      
      return created;
    }
  } catch (error) {
    log('error', 'fingerprint', `Failed to save fingerprint for ${filePath}`, { error });
    return null;
  }
}

/**
 * Get the last known fingerprint for a file
 * @param filePath File path
 * @returns Fingerprint record or null if not found
 */
export async function getLastFingerprint(filePath: string): Promise<any | null> {
  try {
    const fingerprint = await storage.getFingerprintByFilePath(filePath);
    
    if (fingerprint) {
      log('info', 'fingerprint', `Retrieved fingerprint for ${filePath}`, {
        hash: fingerprint.hash,
        id: fingerprint.id
      });
    } else {
      log('info', 'fingerprint', `No fingerprint found for ${filePath}`);
    }
    
    return fingerprint;
  } catch (error) {
    log('error', 'fingerprint', `Failed to get last fingerprint for ${filePath}`, { error });
    return null;
  }
}

/**
 * Check if a file has changed compared to its last fingerprint
 * @param filePath Path to the file
 * @returns true if file has changed or no previous fingerprint exists, false otherwise
 */
export async function hasFileChanged(filePath: string): Promise<boolean> {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      log('warning', 'fingerprint', `Cannot check if file changed, file not found: ${filePath}`);
      return false;
    }
    
    // Get last known fingerprint
    const lastFingerprint = await getLastFingerprint(filePath);
    
    // If no previous fingerprint, consider it changed
    if (!lastFingerprint) {
      log('info', 'fingerprint', `No previous fingerprint for ${filePath}, considering changed`);
      return true;
    }
    
    // Get current fingerprint
    const currentFingerprint = await getFileFingerprint(filePath);
    
    // Compare fingerprints
    const hasChanged = currentFingerprint !== lastFingerprint.hash;
    
    if (hasChanged) {
      log('info', 'fingerprint', `File ${filePath} has changed`);
    } else {
      log('info', 'fingerprint', `File ${filePath} has not changed`);
    }
    
    return hasChanged;
  } catch (error) {
    log('error', 'fingerprint', `Error checking if file ${filePath} has changed`, { error });
    return true; // Consider changed on error to be safe
  }
}