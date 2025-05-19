/**
 * Conflict Resolution Utilities
 * 
 * Provides advanced tools for detecting and resolving conflicts
 * between different versions of files.
 */
import * as diff from 'diff';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FileDiff } from '@shared/types';
import { log } from './logger';
import { storage } from '../storage';
import { generateFingerprint } from './fingerprint';
import { createDiff, applyDiff, checkDiffApplicability } from './fileDiff';

/**
 * Conflict types
 */
export enum ConflictType {
  NONE = 'none',                   // No conflict detected
  DIRECT = 'direct',               // Direct conflict (same lines modified)
  ADJACENT = 'adjacent',           // Adjacent lines modified
  DEPENDENCY = 'dependency',       // Indirect conflict through dependencies
  STRUCTURAL = 'structural',       // Structural conflict (e.g., one adds a method, other removes the class)
  SEMANTIC = 'semantic'            // Semantic conflict (changes work syntactically but break semantics)
}

/**
 * Conflict resolution strategies
 */
export enum ResolutionStrategy {
  THEIRS = 'theirs',               // Accept their changes
  OURS = 'ours',                   // Accept our changes
  MERGE = 'merge',                 // Merge changes (auto or manual)
  REBASE = 'rebase',               // Rebase our changes on theirs
  CHERRY_PICK = 'cherry-pick',     // Cherry-pick specific changes
  DISCARD_BOTH = 'discard-both',   // Discard both changes
  CUSTOM = 'custom'                // Custom resolution
}

/**
 * Change chunk represents a specific change within a diff
 */
export interface ChangeChunk {
  lineStart: number;
  lineEnd: number;
  content: string;
  type: 'add' | 'remove' | 'context';
}

/**
 * Conflict block representing a specific conflict
 */
export interface ConflictBlock {
  filePath: string;
  type: ConflictType;
  severity: 'low' | 'medium' | 'high';
  baseContent: string;
  ourChanges: ChangeChunk[];
  theirChanges: ChangeChunk[];
  startLine: number;
  endLine: number;
  resolution?: {
    strategy: ResolutionStrategy;
    resolvedContent: string;
  };
}

/**
 * Conflict result for a single file
 */
export interface ConflictResult {
  filePath: string;
  hasConflict: boolean;
  conflicts: ConflictBlock[];
  mergedContent?: string;
  originalContent: string;
  ourContent: string;
  theirContent: string;
  canAutoResolve: boolean;
}

/**
 * Check for conflicts between two versions of a file
 * @param filePath File path
 * @param baseContent Base content (original)
 * @param ourContent Our version of the file
 * @param theirContent Their version of the file
 * @returns Conflict result
 */
export function checkForConflicts(
  filePath: string,
  baseContent: string,
  ourContent: string,
  theirContent: string
): ConflictResult {
  try {
    // Generate diffs
    const ourDiff = diff.structuredPatch(filePath, filePath, baseContent, ourContent, '', '');
    const theirDiff = diff.structuredPatch(filePath, filePath, baseContent, theirContent, '', '');
    
    // If either side has no changes, there's no conflict
    if (ourDiff.hunks.length === 0 || theirDiff.hunks.length === 0) {
      return {
        filePath,
        hasConflict: false,
        conflicts: [],
        originalContent: baseContent,
        ourContent,
        theirContent,
        canAutoResolve: true,
        mergedContent: theirDiff.hunks.length === 0 ? ourContent : theirContent
      };
    }
    
    // Convert hunks to more manageable chunks
    const ourChunks = convertHunksToChunks(ourDiff.hunks);
    const theirChunks = convertHunksToChunks(theirDiff.hunks);
    
    // Detect conflicts between chunks
    const conflicts = detectConflicts(filePath, baseContent, ourChunks, theirChunks);
    
    // Check if we can auto-resolve
    const canAutoResolve = conflicts.every(conflict => 
      conflict.type === ConflictType.NONE || 
      conflict.type === ConflictType.ADJACENT
    );
    
    // Try to merge if possible
    let mergedContent: string | undefined;
    if (canAutoResolve) {
      try {
        mergedContent = mergeDiffs(baseContent, ourDiff, theirDiff);
      } catch (error) {
        log('error', 'conflict', `Failed to auto-merge conflicts in ${filePath}`, { error });
      }
    }
    
    return {
      filePath,
      hasConflict: conflicts.length > 0,
      conflicts,
      originalContent: baseContent,
      ourContent,
      theirContent,
      canAutoResolve,
      mergedContent
    };
  } catch (error) {
    log('error', 'conflict', `Error checking for conflicts in ${filePath}`, { error });
    
    // Return a fallback result
    return {
      filePath,
      hasConflict: true,
      conflicts: [{
        filePath,
        type: ConflictType.DIRECT,
        severity: 'high',
        baseContent,
        ourChanges: [],
        theirChanges: [],
        startLine: 0,
        endLine: 0
      }],
      originalContent: baseContent,
      ourContent,
      theirContent,
      canAutoResolve: false
    };
  }
}

/**
 * Convert diff hunks to change chunks
 * @param hunks Diff hunks
 * @returns Array of change chunks
 */
function convertHunksToChunks(hunks: diff.Hunk[]): ChangeChunk[] {
  const chunks: ChangeChunk[] = [];
  
  for (const hunk of hunks) {
    let lineStart = hunk.oldStart;
    
    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        chunks.push({
          lineStart,
          lineEnd: lineStart,
          content: line.substring(1),
          type: 'remove'
        });
        lineStart++;
      } else if (line.startsWith('+')) {
        chunks.push({
          lineStart,
          lineEnd: lineStart,
          content: line.substring(1),
          type: 'add'
        });
        // Don't increment lineStart for added lines
      } else {
        // Context line
        chunks.push({
          lineStart,
          lineEnd: lineStart,
          content: line.substring(1),
          type: 'context'
        });
        lineStart++;
      }
    }
  }
  
  return chunks;
}

/**
 * Detect conflicts between our and their changes
 * @param filePath File path
 * @param baseContent Base content
 * @param ourChunks Our change chunks
 * @param theirChunks Their change chunks
 * @returns Array of conflict blocks
 */
function detectConflicts(
  filePath: string,
  baseContent: string,
  ourChunks: ChangeChunk[],
  theirChunks: ChangeChunk[]
): ConflictBlock[] {
  const conflicts: ConflictBlock[] = [];
  const baseLines = baseContent.split('\n');
  
  // Group chunks into ranges for easier conflict detection
  const ourRanges = groupChunksIntoRanges(ourChunks);
  const theirRanges = groupChunksIntoRanges(theirChunks);
  
  // Check for direct and adjacent conflicts
  for (const ourRange of ourRanges) {
    for (const theirRange of theirRanges) {
      // Direct conflict (overlapping lines)
      if (isOverlapping(ourRange, theirRange)) {
        // Determine conflict severity
        const severity = determineSeverity(ourRange, theirRange);
        
        conflicts.push({
          filePath,
          type: ConflictType.DIRECT,
          severity,
          baseContent: extractBaseContent(baseLines, ourRange, theirRange),
          ourChanges: ourChunks.filter(chunk => 
            chunk.lineStart >= ourRange.start && chunk.lineEnd <= ourRange.end
          ),
          theirChanges: theirChunks.filter(chunk => 
            chunk.lineStart >= theirRange.start && chunk.lineEnd <= theirRange.end
          ),
          startLine: Math.min(ourRange.start, theirRange.start),
          endLine: Math.max(ourRange.end, theirRange.end)
        });
      }
      // Adjacent conflict (changes in adjacent lines)
      else if (isAdjacent(ourRange, theirRange)) {
        conflicts.push({
          filePath,
          type: ConflictType.ADJACENT,
          severity: 'low',
          baseContent: extractBaseContent(baseLines, ourRange, theirRange),
          ourChanges: ourChunks.filter(chunk => 
            chunk.lineStart >= ourRange.start && chunk.lineEnd <= ourRange.end
          ),
          theirChanges: theirChunks.filter(chunk => 
            chunk.lineStart >= theirRange.start && chunk.lineEnd <= theirRange.end
          ),
          startLine: Math.min(ourRange.start, theirRange.start),
          endLine: Math.max(ourRange.end, theirRange.end)
        });
      }
    }
  }
  
  // TODO: Add detection for structural and semantic conflicts
  // This would require more advanced analysis of the code
  
  return conflicts;
}

/**
 * Group change chunks into contiguous ranges
 * @param chunks Change chunks
 * @returns Array of ranges
 */
function groupChunksIntoRanges(chunks: ChangeChunk[]): { start: number, end: number }[] {
  if (chunks.length === 0) {
    return [];
  }
  
  // Sort chunks by line number
  const sortedChunks = [...chunks].sort((a, b) => a.lineStart - b.lineStart);
  
  // Group into ranges
  const ranges: { start: number, end: number }[] = [];
  let currentRange = { 
    start: sortedChunks[0].lineStart, 
    end: sortedChunks[0].lineEnd 
  };
  
  for (let i = 1; i < sortedChunks.length; i++) {
    const chunk = sortedChunks[i];
    
    // If this chunk is adjacent or overlapping with current range, extend the range
    if (chunk.lineStart <= currentRange.end + 5) {
      currentRange.end = Math.max(currentRange.end, chunk.lineEnd);
    } else {
      // Start a new range
      ranges.push(currentRange);
      currentRange = { start: chunk.lineStart, end: chunk.lineEnd };
    }
  }
  
  // Add the last range
  ranges.push(currentRange);
  
  return ranges;
}

/**
 * Check if two ranges overlap
 * @param range1 First range
 * @param range2 Second range
 * @returns Whether the ranges overlap
 */
function isOverlapping(
  range1: { start: number, end: number }, 
  range2: { start: number, end: number }
): boolean {
  return Math.max(range1.start, range2.start) <= Math.min(range1.end, range2.end);
}

/**
 * Check if two ranges are adjacent (within 3 lines)
 * @param range1 First range
 * @param range2 Second range
 * @returns Whether the ranges are adjacent
 */
function isAdjacent(
  range1: { start: number, end: number }, 
  range2: { start: number, end: number }
): boolean {
  const gap = Math.max(range1.start, range2.start) - Math.min(range1.end, range2.end);
  return gap > 0 && gap <= 3;
}

/**
 * Extract base content for conflict
 * @param baseLines Base content lines
 * @param range1 First range
 * @param range2 Second range
 * @returns Base content for conflict
 */
function extractBaseContent(
  baseLines: string[],
  range1: { start: number, end: number },
  range2: { start: number, end: number }
): string {
  const start = Math.max(0, Math.min(range1.start, range2.start) - 3);
  const end = Math.min(baseLines.length, Math.max(range1.end, range2.end) + 3);
  
  return baseLines.slice(start, end).join('\n');
}

/**
 * Determine conflict severity
 * @param range1 First range
 * @param range2 Second range
 * @returns Conflict severity
 */
function determineSeverity(
  range1: { start: number, end: number }, 
  range2: { start: number, end: number }
): 'low' | 'medium' | 'high' {
  // Calculate overlap percentage
  const overlapStart = Math.max(range1.start, range2.start);
  const overlapEnd = Math.min(range1.end, range2.end);
  const overlapSize = overlapEnd - overlapStart + 1;
  
  const range1Size = range1.end - range1.start + 1;
  const range2Size = range2.end - range2.start + 1;
  
  const overlapPercentage = overlapSize / Math.max(range1Size, range2Size);
  
  if (overlapPercentage > 0.7) {
    return 'high';
  } else if (overlapPercentage > 0.3) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Merge two diffs into a single result
 * @param baseContent Base content
 * @param ourDiff Our diff
 * @param theirDiff Their diff
 * @returns Merged content
 */
function mergeDiffs(
  baseContent: string,
  ourDiff: diff.ParsedDiff,
  theirDiff: diff.ParsedDiff
): string {
  // Create a simple 3-way merge by applying our changes then their changes
  const ourContent = applyDiffObject(baseContent, ourDiff);
  
  // Create a new diff from their changes against the base
  const theirPatch = diff.createPatch('file', baseContent, applyDiffObject(baseContent, theirDiff), '', '');
  const theirParsedPatch = diff.parsePatch(theirPatch)[0];
  
  // Try to apply their changes to our content
  const result = diff.applyPatch(ourContent, theirParsedPatch);
  
  if (result === false) {
    throw new Error('Failed to merge diffs');
  }
  
  return result;
}

/**
 * Apply a parsed diff object to content
 * @param content Content to apply diff to
 * @param parsedDiff Parsed diff
 * @returns Modified content
 */
function applyDiffObject(content: string, parsedDiff: diff.ParsedDiff): string {
  const patch = diff.createPatch(
    parsedDiff.oldFileName || 'file',
    content,
    content, // This will be ignored
    '', ''
  );
  
  // Replace the hunks
  const patchLines = patch.split('\n');
  let hunkStartIdx = -1;
  
  // Find the start of the hunk section
  for (let i = 0; i < patchLines.length; i++) {
    if (patchLines[i].startsWith('@@')) {
      hunkStartIdx = i;
      break;
    }
  }
  
  if (hunkStartIdx === -1) {
    return content; // No hunks found
  }
  
  // Replace with our hunks
  const newPatchLines = [
    ...patchLines.slice(0, hunkStartIdx),
    ...parsedDiff.hunks.map(hunk => {
      const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
      return [hunkHeader, ...hunk.lines].join('\n');
    }).join('\n').split('\n')
  ];
  
  const newPatch = newPatchLines.join('\n');
  const parsedPatch = diff.parsePatch(newPatch)[0];
  
  const result = diff.applyPatch(content, parsedPatch);
  
  if (result === false) {
    throw new Error('Failed to apply diff');
  }
  
  return result;
}

/**
 * Resolve a conflict using the specified strategy
 * @param conflict Conflict to resolve
 * @param strategy Resolution strategy
 * @param customContent Custom content for custom resolution
 * @returns Resolved content
 */
export function resolveConflict(
  conflict: ConflictBlock,
  strategy: ResolutionStrategy,
  customContent?: string
): string {
  switch (strategy) {
    case ResolutionStrategy.OURS:
      return applyOurChanges(conflict);
      
    case ResolutionStrategy.THEIRS:
      return applyTheirChanges(conflict);
      
    case ResolutionStrategy.MERGE:
      return mergeBothChanges(conflict);
      
    case ResolutionStrategy.DISCARD_BOTH:
      return conflict.baseContent;
      
    case ResolutionStrategy.CUSTOM:
      if (!customContent) {
        throw new Error('Custom content required for custom resolution');
      }
      return customContent;
      
    default:
      throw new Error(`Resolution strategy ${strategy} not implemented`);
  }
}

/**
 * Apply our changes to resolve a conflict
 * @param conflict Conflict to resolve
 * @returns Resolved content
 */
function applyOurChanges(conflict: ConflictBlock): string {
  const baseLines = conflict.baseContent.split('\n');
  const result = [...baseLines];
  
  // Apply our changes in reverse order to avoid index shifting
  const sortedChanges = [...conflict.ourChanges]
    .sort((a, b) => b.lineStart - a.lineStart);
  
  for (const change of sortedChanges) {
    if (change.type === 'add') {
      // Insert a new line
      result.splice(change.lineStart, 0, change.content);
    } else if (change.type === 'remove') {
      // Remove a line
      result.splice(change.lineStart - 1, 1);
    }
  }
  
  return result.join('\n');
}

/**
 * Apply their changes to resolve a conflict
 * @param conflict Conflict to resolve
 * @returns Resolved content
 */
function applyTheirChanges(conflict: ConflictBlock): string {
  const baseLines = conflict.baseContent.split('\n');
  const result = [...baseLines];
  
  // Apply their changes in reverse order to avoid index shifting
  const sortedChanges = [...conflict.theirChanges]
    .sort((a, b) => b.lineStart - a.lineStart);
  
  for (const change of sortedChanges) {
    if (change.type === 'add') {
      // Insert a new line
      result.splice(change.lineStart, 0, change.content);
    } else if (change.type === 'remove') {
      // Remove a line
      result.splice(change.lineStart - 1, 1);
    }
  }
  
  return result.join('\n');
}

/**
 * Merge both sets of changes to resolve a conflict
 * @param conflict Conflict to resolve
 * @returns Resolved content
 */
function mergeBothChanges(conflict: ConflictBlock): string {
  // This is a simplistic merge that tries to apply both changes
  // A more sophisticated merge would analyze the specific changes
  
  // First apply our changes
  const withOurChanges = applyOurChanges(conflict);
  
  // Then try to apply their changes to the result
  const theirChangesAsPatches: diff.Hunk[] = [];
  
  let currentHunk: diff.Hunk | null = null;
  
  for (const change of conflict.theirChanges) {
    if (change.type !== 'context') {
      if (!currentHunk) {
        currentHunk = {
          oldStart: change.lineStart,
          oldLines: 0,
          newStart: change.lineStart,
          newLines: 0,
          lines: []
        };
      }
      
      if (change.type === 'add') {
        currentHunk.lines.push(`+${change.content}`);
        currentHunk.newLines++;
      } else if (change.type === 'remove') {
        currentHunk.lines.push(`-${change.content}`);
        currentHunk.oldLines++;
      }
    } else if (currentHunk) {
      theirChangesAsPatches.push(currentHunk);
      currentHunk = null;
    }
  }
  
  if (currentHunk) {
    theirChangesAsPatches.push(currentHunk);
  }
  
  // Create a patch with their hunks
  const theirPatch: diff.ParsedDiff = {
    oldFileName: conflict.filePath,
    newFileName: conflict.filePath,
    oldHeader: '',
    newHeader: '',
    hunks: theirChangesAsPatches
  };
  
  try {
    return applyDiffObject(withOurChanges, theirPatch);
  } catch (error) {
    // If merge fails, just return our changes
    log('warning', 'conflict', `Failed to merge changes, returning our version`, { error });
    return withOurChanges;
  }
}

/**
 * Check if changes can be applied cleanly to a file
 * @param filePath Path to the file
 * @param changes Change content
 * @returns Whether changes can be applied cleanly
 */
export async function canApplyCleanly(
  filePath: string,
  changes: string
): Promise<boolean> {
  try {
    // Ensure the file exists
    if (!await fs.pathExists(filePath)) {
      return false;
    }
    
    // Read the current content
    const currentContent = await fs.readFile(filePath, 'utf-8');
    
    // Create a diff between the current content and the changes
    const patchContent = createDiff(filePath, currentContent, changes);
    
    // Check if the diff can be applied cleanly
    return checkDiffApplicability(patchContent, currentContent);
  } catch (error) {
    log('error', 'conflict', `Failed to check if changes can be applied cleanly to ${filePath}`, { error });
    return false;
  }
}

/**
 * Generate a conflict markup (similar to Git)
 * @param conflict Conflict block
 * @returns Content with conflict markers
 */
export function generateConflictMarkup(conflict: ConflictBlock): string {
  const baseLines = conflict.baseContent.split('\n');
  
  // Apply our changes
  const ourContent = applyOurChanges(conflict);
  
  // Apply their changes
  const theirContent = applyTheirChanges(conflict);
  
  // Create conflict markers
  return [
    '<<<<<<< OURS',
    ourContent,
    '=======',
    theirContent,
    '>>>>>>> THEIRS'
  ].join('\n');
}

/**
 * Create a visual diff for the UI
 * @param originalContent Original content
 * @param modifiedContent Modified content
 * @returns HTML markup with diff highlighting
 */
export function createVisualDiff(
  originalContent: string,
  modifiedContent: string
): string {
  const changes = diff.diffLines(originalContent, modifiedContent);
  
  let html = '<div class="diff">';
  
  changes.forEach(part => {
    const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    
    // Escape HTML special characters
    const escapedValue = part.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Split into lines and add line numbers
    const lines = escapedValue.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (i === lines.length - 1 && lines[i] === '') {
        continue; // Skip empty last line
      }
      
      html += `<div class="line ${part.added ? 'added' : part.removed ? 'removed' : 'unchanged'}">`;
      html += `<span class="prefix">${prefix}</span>`;
      html += `<span class="content">${lines[i]}</span>`;
      html += '</div>';
    }
  });
  
  html += '</div>';
  
  return html;
}