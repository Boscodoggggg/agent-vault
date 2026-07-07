export type AgentProvider = 'codex' | 'claude-code';

export type AgentRole = 'user' | 'assistant' | 'tool' | 'system';

export interface AgentMessage {
  role: AgentRole;
  content: string;
  timestamp?: string;
}

export interface AgentSession {
  id: string;
  provider: AgentProvider;
  title: string;
  sourcePath: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
  createdAt?: string;
  updatedAt?: string;
  messages: AgentMessage[];
  errors?: Array<{ line: number; message: string }>;
}

export interface ScanOptions {
  homeDir?: string;
  providers?: AgentProvider[];
}

export interface GitSnapshot {
  branch?: string;
  head?: string;
  status?: string;
  diff?: string;
}
