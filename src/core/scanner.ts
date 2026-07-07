import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { findJsonlFiles } from './fs';
import { parseSessionFile } from './providers';
import type { AgentProvider, AgentSession, ScanOptions } from './types';

const PROVIDER_ROOTS: Record<AgentProvider, (homeDir: string) => string> = {
  codex: (homeDir) => join(homeDir, '.codex', 'sessions'),
  'claude-code': (homeDir) => join(homeDir, '.claude', 'projects')
};

export async function scanAgentSessions(options: ScanOptions = {}): Promise<AgentSession[]> {
  const homeDir = options.homeDir ?? homedir();
  const providers = options.providers ?? (Object.keys(PROVIDER_ROOTS) as AgentProvider[]);
  const sessions: AgentSession[] = [];

  for (const provider of providers) {
    const root = PROVIDER_ROOTS[provider](homeDir);
    const files = await findJsonlFiles(root);

    for (const file of files) {
      const raw = await readFile(file, 'utf8');
      const session = parseSessionFile(provider, file, raw);
      if (session) sessions.push(session);
    }
  }

  return sessions.sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''));
}

export function providerRoot(provider: AgentProvider, homeDir = homedir()): string {
  return PROVIDER_ROOTS[provider](homeDir);
}
