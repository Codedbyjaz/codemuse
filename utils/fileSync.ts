/**
 * File Synchronization Module
 * 
 * Provides utilities for syncing files between different platforms/sources
 * with proper error handling, diff generation, and conflict resolution.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as DiffMatchPatch from 'diff-match-patch';
import { nanoid } from 'nanoid';
import { log } from './logger';
import { env } from '../config/environment';

// Initialize the diff-match-patch library
const dmp = new DiffMatchPatch.diff_match_patch();

/**
 * File representation with content and metadata
 */
export interface FileData {
  filePath: string;
  content: string;
  lastModified: Date;
  hash?: string;
}

/**
 * Result of a file sync operation
 */
export interface SyncResult {
  success: boolean;
  filePath: string;
  changeId?: string;
  diff?: string;
  error?: string;
  conflicts?: boolean;
}

/**
 * Options for file sync operations
 */
export interface SyncOptions {
  overwrite?: boolean;
  dryRun?: boolean;
  createBackup?: boolean;
  ignorePatterns?: string[];
  timeout?: number;
}

/**
 * Default sync options
 */
const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  overwrite: false,
  dryRun: false,
  createBackup: true,
  ignorePatterns: [],
  timeout: env.DEFAULT_SYNC_TIMEOUT,
};

/**
 * Calculates a hash for file content for change detection
 * @param content File content to hash
 * @returns Hash string
 */
export function calculateFileHash(content: string): string {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString();
}

/**
 * Validates that a file path is safe and doesn't contain path traversal attempts
 * @param filePath Path to validate
 * @returns Whether the path is safe
 */
export function isValidFilePath(filePath: string): boolean {
  // Normalize the path to handle different path formats
  const normalizedPath = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    log('warn', 'sync', 'Path traversal attempt detected', { filePath });
    return false;
  }
  
  return true;
}

/**
 * Generates a unified diff between original and modified content
 * @param originalContent Original file content
 * @param modifiedContent Modified file content
 * @param filePath File path for context
 * @returns Unified diff string
 */
export function generateDiff(originalContent: string, modifiedContent: string, filePath: string): string {
  log('info', 'diff', `Generating diff for ${filePath}`);
  
  try {
    const patches = dmp.patch_make(originalContent, modifiedContent);
    const diffText = dmp.patch_toText(patches);
    
    return diffText;
  } catch (error) {
    log('error', 'diff', `Failed to generate diff for ${filePath}`, { error });
    throw new Error(`Failed to generate diff: ${(error as Error).message}`);
  }
}

/**
 * Applies a diff patch to content
 * @param content Original content
 * @param diffText Diff patch text
 * @returns Patched content and success info
 */
export function applyDiff(content: string, diffText: string): { 
  content: string; 
  success: boolean;
  results: boolean[];
} {
  try {
    const patches = dmp.patch_fromText(diffText);
    const [patchedContent, results] = dmp.patch_apply(patches, content);
    
    const success = results.every(result => result === true);
    
    return {
      content: patchedContent,
      success,
      results
    };
  } catch (error) {
    log('error', 'diff', 'Failed to apply diff', { error });
    throw new Error(`Failed to apply diff: ${(error as Error).message}`);
  }
}

/**
 * Creates a backup of a file before modifying it
 * @param filePath Path to the file
 * @returns Path to the backup file
 */
async function createFileBackup(filePath: string): Promise<string> {
  try {
    const backupDir = path.join(env.LOGS_DIR, 'backups');
    await fs.ensureDir(backupDir);
    
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.bak`);
    
    await fs.copy(filePath, backupPath);
    log('info', 'sync', `Created backup at ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    log('error', 'sync', `Failed to create backup for ${filePath}`, { error });
    throw new Error(`Failed to create backup: ${(error as Error).message}`);
  }
}

/**
 * Reads a file with proper error handling
 * @param filePath Path to the file
 * @returns File content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    if (!isValidFilePath(filePath)) {
      throw new Error('Invalid file path');
    }
    
    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      log('warn', 'sync', `File does not exist: ${filePath}`);
      return '';
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    log('error', 'sync', `Failed to read file: ${filePath}`, { error });
    throw new Error(`Failed to read file: ${(error as Error).message}`);
  }
}

/**
 * Writes content to a file with proper error handling
 * @param filePath Path to the file
 * @param content Content to write
 * @param options Write options
 */
export async function writeFile(
  filePath: string, 
  content: string, 
  options: { createBackup?: boolean } = {}
): Promise<void> {
  try {
    if (!isValidFilePath(filePath)) {
      throw new Error('Invalid file path');
    }
    
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.ensureDir(dirPath);
    
    // Create backup if requested
    if (options.createBackup) {
      const exists = await fs.pathExists(filePath);
      if (exists) {
        await createFileBackup(filePath);
      }
    }
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    log('info', 'sync', `Successfully wrote to file: ${filePath}`);
  } catch (error) {
    log('error', 'sync', `Failed to write file: ${filePath}`, { error });
    throw new Error(`Failed to write file: ${(error as Error).message}`);
  }
}

/**
 * Synchronizes a file from source to destination
 * @param sourceFile Source file data
 * @param destFilePath Destination file path
 * @param options Sync options
 * @returns Sync operation result
 */
export async function syncFile(
  sourceFile: FileData,
  destFilePath: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const syncOptions = { ...DEFAULT_SYNC_OPTIONS, ...options };
  const changeId = nanoid();
  
  log('info', 'sync', `Starting file sync for ${sourceFile.filePath} to ${destFilePath}`, {
    changeId,
    options: syncOptions
  });
  
  try {
    if (!isValidFilePath(sourceFile.filePath) || !isValidFilePath(destFilePath)) {
      return {
        success: false,
        filePath: sourceFile.filePath,
        changeId,
        error: 'Invalid file path'
      };
    }
    
    // Check if destination file exists
    const destExists = await fs.pathExists(destFilePath);
    let destContent = '';
    
    if (destExists) {
      destContent = await readFile(destFilePath);
    }
    
    // Generate diff between source and destination
    const diff = generateDiff(destContent, sourceFile.content, sourceFile.filePath);
    
    // If this is a dry run, just return the diff
    if (syncOptions.dryRun) {
      log('info', 'sync', `Dry run completed for ${sourceFile.filePath}`, { changeId });
      return {
        success: true,
        filePath: sourceFile.filePath,
        changeId,
        diff
      };
    }
    
    // Check for conflicts if not overwriting
    if (!syncOptions.overwrite && destExists) {
      // In a real implementation, this would include more sophisticated
      // conflict detection, such as checking if the file has been modified
      // since last sync
      const sourceHash = calculateFileHash(sourceFile.content);
      const destHash = calculateFileHash(destContent);
      
      if (sourceHash !== destHash && destContent !== '') {
        log('warn', 'sync', `Conflict detected for ${sourceFile.filePath}`, { changeId });
        return {
          success: false,
          filePath: sourceFile.filePath,
          changeId,
          diff,
          conflicts: true,
          error: 'Conflict detected'
        };
      }
    }
    
    // Write the file
    await writeFile(destFilePath, sourceFile.content, {
      createBackup: syncOptions.createBackup
    });
    
    log('info', 'sync', `Successfully synced ${sourceFile.filePath} to ${destFilePath}`, { changeId });
    
    return {
      success: true,
      filePath: sourceFile.filePath,
      changeId,
      diff
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    log('error', 'sync', `Failed to sync ${sourceFile.filePath}`, { 
      error: errorMessage,
      changeId
    });
    
    return {
      success: false,
      filePath: sourceFile.filePath,
      changeId,
      error: errorMessage
    };
  }
}

/**
 * Synchronizes multiple files from source to destination
 * @param files Array of source files
 * @param destDir Destination directory
 * @param options Sync options
 * @returns Results for each file sync operation
 */
export async function syncFiles(
  files: FileData[],
  destDir: string,
  options: SyncOptions = {}
): Promise<SyncResult[]> {
  const syncId = nanoid();
  log('info', 'sync', `Starting sync of ${files.length} files to ${destDir}`, { 
    syncId,
    fileCount: files.length
  });
  
  try {
    // Ensure destination directory exists
    await fs.ensureDir(destDir);
    
    // Process files in parallel with Promise.all
    const results = await Promise.all(
      files.map(async (file) => {
        const destPath = path.join(destDir, file.filePath);
        return syncFile(file, destPath, options);
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    log('info', 'sync', `Completed sync of ${files.length} files. Success: ${successCount}, Failed: ${files.length - successCount}`, {
      syncId
    });
    
    return results;
  } catch (error) {
    log('error', 'sync', `Failed to sync files to ${destDir}`, { error, syncId });
    throw new Error(`Failed to sync files: ${(error as Error).message}`);
  }
}