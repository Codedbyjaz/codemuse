/**
 * File Diff Utilities
 * 
 * Provides functionality for creating, applying, and checking
 * differences between file versions.
 */
import * as diff from 'diff';
import * as path from 'path';
import { log } from './logger';

/**
 * Create a diff between original and modified content
 * @param filePath File path (used for logging)
 * @param original Original content
 * @param modified Modified content
 * @param contextLines Number of context lines to include (default: 3)
 * @returns Unified diff string
 */
export function createDiff(
  filePath: string,
  original: string,
  modified: string,
  contextLines: number = 3
): string {
  try {
    const patch = diff.createPatch(
      path.basename(filePath),
      original,
      modified,
      '',
      '',
      { context: contextLines }
    );
    
    return patch;
  } catch (error) {
    log('error', 'diff', `Failed to create diff for ${filePath}`, { error });
    throw new Error(`Failed to create diff: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Apply a diff to content
 * @param patchContent Patch content (unified diff)
 * @param originalContent Original content to patch
 * @returns Patched content
 */
export function applyDiff(
  patchContent: string,
  originalContent: string
): string {
  try {
    // Parse the patch
    const patches = diff.parsePatch(patchContent);
    
    if (patches.length === 0) {
      // No patches, return original content
      return originalContent;
    }
    
    // Apply the first patch
    const result = diff.applyPatch(originalContent, patches[0]);
    
    if (result === false) {
      throw new Error('Failed to apply patch');
    }
    
    return result;
  } catch (error) {
    log('error', 'diff', 'Failed to apply diff', { error });
    throw new Error(`Failed to apply diff: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a diff can be applied cleanly to content
 * @param patchContent Patch content (unified diff)
 * @param originalContent Original content to check against
 * @returns Whether the patch can be applied cleanly
 */
export function checkDiffApplicability(
  patchContent: string,
  originalContent: string
): boolean {
  try {
    // Parse the patch
    const patches = diff.parsePatch(patchContent);
    
    if (patches.length === 0) {
      // No patches, always applicable
      return true;
    }
    
    // Check if the patch applies
    const result = diff.applyPatch(originalContent, patches[0], true);
    
    return result !== false;
  } catch (error) {
    log('error', 'diff', 'Failed to check diff applicability', { error });
    return false;
  }
}

/**
 * Split a patch into hunks and analyze each one
 * @param patchContent Patch content (unified diff)
 * @returns Analysis of each hunk
 */
export function analyzePatch(
  patchContent: string
): Array<{
  hunk: diff.Hunk;
  stats: {
    added: number;
    removed: number;
    contextLines: number;
  };
}> {
  try {
    // Parse the patch
    const patches = diff.parsePatch(patchContent);
    
    if (patches.length === 0) {
      return [];
    }
    
    // Analyze each hunk
    return patches[0].hunks.map(hunk => {
      let added = 0;
      let removed = 0;
      let contextLines = 0;
      
      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          added++;
        } else if (line.startsWith('-')) {
          removed++;
        } else {
          contextLines++;
        }
      }
      
      return {
        hunk,
        stats: {
          added,
          removed,
          contextLines
        }
      };
    });
  } catch (error) {
    log('error', 'diff', 'Failed to analyze patch', { error });
    return [];
  }
}

/**
 * Create a summary of differences
 * @param original Original content
 * @param modified Modified content
 * @returns Summary of changes
 */
export function summarizeDiff(
  original: string,
  modified: string
): {
  addedLines: number;
  removedLines: number;
  changedFiles: number;
  changePercentage: number;
} {
  try {
    // Calculate diff
    const changes = diff.diffLines(original, modified);
    
    let addedLines = 0;
    let removedLines = 0;
    
    for (const change of changes) {
      if (change.added) {
        addedLines += change.count || 0;
      } else if (change.removed) {
        removedLines += change.count || 0;
      }
    }
    
    // Calculate total lines in original
    const originalLines = original.split('\n').length;
    
    // Calculate change percentage
    const changePercentage = originalLines > 0
      ? Math.round(((addedLines + removedLines) / originalLines) * 100)
      : (modified.length > 0 ? 100 : 0);
    
    return {
      addedLines,
      removedLines,
      changedFiles: 1, // Always 1 for a single file diff
      changePercentage
    };
  } catch (error) {
    log('error', 'diff', 'Failed to summarize diff', { error });
    
    return {
      addedLines: 0,
      removedLines: 0,
      changedFiles: 0,
      changePercentage: 0
    };
  }
}