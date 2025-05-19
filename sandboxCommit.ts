/**
 * Sandbox Commit Utilities
 * 
 * Provides functionality for safely applying changes to files
 * in a sandbox environment before committing to production.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileDiff, CommitData } from '@shared/types';
import { log } from './logger';
import { applyDiff } from './fileDiff';
import { PROJECT_PATH, SANDBOX_PATH } from '../config';

/**
 * Apply changes to sandbox environment
 * @param diffs Array of file diffs to apply
 * @returns Whether all changes were applied successfully
 */
export async function applyToSandbox(diffs: FileDiff[]): Promise<boolean> {
  try {
    // Ensure sandbox directory exists
    await fs.ensureDir(SANDBOX_PATH);
    
    // Track successes and failures
    let allSuccessful = true;
    const results: Record<string, boolean> = {};
    
    // Apply each diff
    for (const diff of diffs) {
      try {
        const filePath = path.join(SANDBOX_PATH, diff.file);
        const dirPath = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.ensureDir(dirPath);
        
        // If file has original content or already exists in sandbox
        let originalContent = '';
        
        if (diff.original) {
          // Use provided original content
          originalContent = diff.original;
        } else if (await fs.pathExists(filePath)) {
          // Read from existing sandbox file
          originalContent = await fs.readFile(filePath, 'utf-8');
        }
        
        // If modified content is provided directly, use it
        if (diff.modified !== undefined) {
          await fs.writeFile(filePath, diff.modified);
          results[diff.file] = true;
          continue;
        }
        
        // Otherwise apply the diff
        const newContent = applyDiff(diff.diff, originalContent);
        await fs.writeFile(filePath, newContent);
        
        results[diff.file] = true;
      } catch (error) {
        log('error', 'sandbox', `Failed to apply diff to sandbox for ${diff.file}`, { error });
        results[diff.file] = false;
        allSuccessful = false;
      }
    }
    
    log('info', 'sandbox', `Applied ${Object.values(results).filter(Boolean).length}/${diffs.length} diffs to sandbox`, {
      results
    });
    
    return allSuccessful;
  } catch (error) {
    log('error', 'sandbox', 'Failed to apply diffs to sandbox', { error });
    return false;
  }
}

/**
 * Commit changes from sandbox to production
 * @param editId ID of the edit being committed
 * @param agentId ID of the agent making the changes
 * @param approvedBy ID or name of user who approved (optional)
 * @param files Optional list of specific files to commit (commits all sandbox files if not specified)
 * @returns Commit data if successful, null if failed
 */
export async function commitFromSandbox(
  editId: number,
  agentId: string,
  approvedBy?: string,
  files?: string[]
): Promise<CommitData | null> {
  try {
    // Ensure project directory exists
    await fs.ensureDir(PROJECT_PATH);
    
    // If no files specified, get all files in sandbox
    const filesToCommit = files || await getAllFiles(SANDBOX_PATH);
    
    // Track successes
    const committedFiles: string[] = [];
    
    // Commit each file
    for (const file of filesToCommit) {
      try {
        // Get relative path
        const relativePath = path.isAbsolute(file) 
          ? path.relative(SANDBOX_PATH, file)
          : file;
          
        // Source and destination paths
        const sourcePath = path.join(SANDBOX_PATH, relativePath);
        const destPath = path.join(PROJECT_PATH, relativePath);
        
        // Skip if source doesn't exist
        if (!await fs.pathExists(sourcePath)) {
          log('warning', 'sandbox', `Skipping commit for non-existent file: ${relativePath}`);
          continue;
        }
        
        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(destPath));
        
        // Copy file from sandbox to production
        await fs.copy(sourcePath, destPath, { overwrite: true });
        
        committedFiles.push(relativePath);
      } catch (error) {
        log('error', 'sandbox', `Failed to commit file: ${file}`, { error });
      }
    }
    
    // If nothing was committed, return null
    if (committedFiles.length === 0) {
      log('warning', 'sandbox', 'No files were committed from sandbox to production');
      return null;
    }
    
    // Create commit data
    const commitData: CommitData = {
      editId,
      agentId,
      files: committedFiles,
      timestamp: new Date().toISOString(),
      approvedBy
    };
    
    log('info', 'sandbox', `Committed ${committedFiles.length} files from sandbox to production`, {
      editId,
      agentId,
      fileCount: committedFiles.length
    });
    
    return commitData;
  } catch (error) {
    log('error', 'sandbox', 'Failed to commit from sandbox', { error, editId, agentId });
    return null;
  }
}

/**
 * Get all files in a directory recursively
 * @param dir Directory path
 * @returns Array of file paths (absolute)
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    
    return entry.isDirectory() 
      ? getAllFiles(fullPath)
      : [fullPath];
  }));
  
  return files.flat();
}

/**
 * Create a test environment in sandbox
 * @param files Object mapping file paths to content
 * @returns Whether the environment was created successfully
 */
export async function createTestEnvironment(
  files: Record<string, string>
): Promise<boolean> {
  try {
    // Create diffs
    const diffs: FileDiff[] = Object.entries(files).map(([filePath, content]) => ({
      file: filePath,
      diff: '',
      original: '',
      modified: content
    }));
    
    // Apply to sandbox
    return applyToSandbox(diffs);
  } catch (error) {
    log('error', 'sandbox', 'Failed to create test environment', { error });
    return false;
  }
}

/**
 * Get differences between sandbox and production
 * @param files Optional list of specific files to check
 * @returns Object mapping file paths to diff status
 */
export async function getSandboxDiffs(
  files?: string[]
): Promise<Record<string, { changed: boolean, isNew: boolean, diffSize?: number }>> {
  try {
    const results: Record<string, { changed: boolean, isNew: boolean, diffSize?: number }> = {};
    
    // If no files specified, check all files in sandbox
    const filesToCheck = files || 
      (await getAllFiles(SANDBOX_PATH)).map(f => path.relative(SANDBOX_PATH, f));
    
    for (const relativePath of filesToCheck) {
      const sandboxPath = path.join(SANDBOX_PATH, relativePath);
      const productionPath = path.join(PROJECT_PATH, relativePath);
      
      // Skip if sandbox file doesn't exist
      if (!await fs.pathExists(sandboxPath)) {
        continue;
      }
      
      // Check if file exists in production
      const productionExists = await fs.pathExists(productionPath);
      
      // Read sandbox content
      const sandboxContent = await fs.readFile(sandboxPath, 'utf-8');
      
      if (!productionExists) {
        // New file
        results[relativePath] = { 
          changed: true, 
          isNew: true,
          diffSize: sandboxContent.length
        };
      } else {
        // Existing file, check for differences
        const productionContent = await fs.readFile(productionPath, 'utf-8');
        
        if (sandboxContent !== productionContent) {
          // Calculate rough diff size
          const diffSize = Math.abs(sandboxContent.length - productionContent.length);
          
          results[relativePath] = { 
            changed: true, 
            isNew: false,
            diffSize
          };
        } else {
          // Identical
          results[relativePath] = { 
            changed: false, 
            isNew: false 
          };
        }
      }
    }
    
    return results;
  } catch (error) {
    log('error', 'sandbox', 'Failed to get sandbox diffs', { error });
    return {};
  }
}