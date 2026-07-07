import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanAgentSessions } from '../src/core/scanner';

describe('scanAgentSessions', () => {
  const home = join(process.cwd(), '.tmp-provider-test');

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it('normalizes Codex and Claude Code JSONL sessions from a home directory', async () => {
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

  it('normalizes Codex app payload transcripts from archived sessions', async () => {
    await mkdir(join(home, '.codex/archived_sessions'), { recursive: true });
    await writeFile(
      join(home, '.codex/archived_sessions/rollout-2026-07-07T02-00-00-codex-2.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-07-07T02:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'codex-2',
            cwd: '/repo/app',
            git: { branch: 'main' },
            model_provider: 'openai'
          }
        }),
        JSON.stringify({
          timestamp: '2026-07-07T02:00:30.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: '<environment_context>\\n<cwd>/repo/app</cwd>\\n</environment_context>' }]
          }
        }),
        JSON.stringify({
          timestamp: '2026-07-07T02:01:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message: '继续做中文界面和扫描修复'
          }
        }),
        JSON.stringify({
          timestamp: '2026-07-07T02:02:00.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: '已定位到 payload 格式。' }]
          }
        })
      ].join('\n')
    );

    const sessions = await scanAgentSessions({ homeDir: home, providers: ['codex'] });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: 'codex-2',
      provider: 'codex',
      title: '继续做中文界面和扫描修复',
      cwd: '/repo/app',
      gitBranch: 'main'
    });
    expect(sessions[0]?.messages).toEqual([
      {
        role: 'user',
        timestamp: '2026-07-07T02:01:00.000Z',
        content: '继续做中文界面和扫描修复'
      },
      {
        role: 'assistant',
        timestamp: '2026-07-07T02:02:00.000Z',
        content: '已定位到 payload 格式。'
      }
    ]);
  });
});
