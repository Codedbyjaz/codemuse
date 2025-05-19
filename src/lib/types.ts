// Agent types
export interface Agent {
  id: number;
  agentId: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  metadata: AgentMetadata;
  createdAt: string;
}

export interface AgentMetadata {
  canEdit?: string[];
  canComment?: boolean;
  maxChanges?: number;
}

// Change types
export interface Change {
  id: number;
  agentId: string;
  filePath: string;
  diffContent: string;
  originalContent?: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata: ChangeMetadata;
  createdAt: string;
  updatedAt?: string;
}

export interface ChangeMetadata {
  agent: string;
  timestamp: string;
}

// Lock types
export interface Lock {
  id: number;
  filePath: string;
  pattern?: string | null;
  createdAt: string;
}

// System status information
export interface SystemStatus {
  agents: {
    total: number;
    active: number;
  };
  changes: {
    pending: number;
    approved: number;
    rejected: number;
  };
  locks: number;
}

// Diff related types
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
}

export interface ParsedDiff {
  fileName: string;
  addedLines: number;
  removedLines: number;
  lines: DiffLine[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
}
