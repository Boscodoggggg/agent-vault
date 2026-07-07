import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanAgentSessions } from '../src/core/scanner';

describe('scanAgentSessions', () => {
  it('normalizes Codex and Claude Code JSONL sessions from a home directory', async () => {
    const home = join(process.cwd(), '.tmp-provider-test');
    await mkdir(join(home, '.claude/projects/-repo-app'), { recursive: true });
    await mkdir(join(home, '.codex/sessions/2026/07/07'), { recursive: true });

    await writeFile(
      join(home, '.claude/projects/-repo-app/claude-1.jsonl'),
      [
        JSON.stringify({
          type: 'user',
          sessionId: 'claude-1',
          timestamp: '2026-07-07T01:00:00.000Z',
          cwd: '/repo/app',
          gitBranch: 'main',
          message: { role: 'user', content: 'Fix the account switch regression' }
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'claude-1',
          timestamp: '2026-07-07T01:02:00.000Z',
          message: { role: 'assistant', content: [{ type: 'text', text: 'I found the session cache boundary.' }] }
        })
      ].join('\n')
    );

    await writeFile(
      join(home, '.codex/sessions/2026/07/07/rollout-2026-07-07T02-00-00-codex-1.jsonl'),
      [
        JSON.stringify({
          type: 'turn_context',
          timestamp: '2026-07-07T02:00:00.000Z',
          cwd: '/repo/app',
          model: 'gpt-5.4'
        }),
        JSON.stringify({
          type: 'user_message',
          timestamp: '2026-07-07T02:01:00.000Z',
          message: 'Continue the Electron UI'
        }),
        JSON.stringify({
          type: 'agent_message',
          timestamp: '2026-07-07T02:03:00.000Z',
          message: 'The shell layout is now wired.'
        })
      ].join('\n')
    );

    const sessions = await scanAgentSessions({ homeDir: home });

    expect(sessions.map((session) => session.provider).sort()).toEqual(['claude-code', 'codex']);
    expect(sessions[0]?.title.length).toBeGreaterThan(0);
    expect(sessions.find((session) => session.provider === 'claude-code')?.messages).toHaveLength(2);
    expect(sessions.find((session) => session.provider === 'codex')?.cwd).toBe('/repo/app');
  });
});
