// Common types used throughout the application

// Agent configuration types
export interface AgentConfig {
  role: string;
  canEdit: string[];
  canComment?: boolean;
  maxChanges: number;
}

export interface AgentsConfig {
  [agentId: string]: AgentConfig;
}

// Lock configuration types
export interface PatternLock {
  file: string;
  pattern: string;
}

export interface LocksConfig {
  lockedFiles: string[];
  lockedPatterns: PatternLock[];
}

// Edit status types
export type EditStatus = 'pending' | 'approved' | 'rejected' | 'locked';

// Log level types
export type LogLevel = 'info' | 'warning' | 'error';

// Diff type
export interface FileDiff {
  file: string;
  diff: string;
  original?: string;
  modified?: string;
}

// Filesystem paths configuration
export interface PathsConfig {
  projectDir: string;
  sandboxDir: string;
  logsDir: string;
  cacheDir: string;
}

// Fingerprint cache type
export interface FileFingerprint {
  hash: string;
  timestamp: number;
}

export interface FingerprintCache {
  [filePath: string]: FileFingerprint;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Agent rate limit type
export interface AgentRateLimit {
  requestCount: number;
  windowStart: Date;
  limit: number;
}

// Commit data type
export interface CommitData {
  editId: number;
  agentId: string;
  files: string[];
  timestamp: string;
  approvedBy?: string;
}

// Change type for the websocket communication
export interface Change {
  id: number;
  agentId: string;
  files: string[];
  description: string;
  status: EditStatus; 
  createdAt: Date;
  updatedAt: Date;
  data?: Record<string, any>;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

// Plugin types
export interface PluginMetadata {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  version: string; 
  author: string;
  description: string;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PluginProcessingResult {
  content: string;
  metadata?: Record<string, any>;
  errors: string[];
  warnings: string[];
}
