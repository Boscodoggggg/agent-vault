import { describe, expect, it } from 'vitest';
import { buildContinuationPack } from '../src/core/continuationPack';
import type { AgentSession } from '../src/core/types';

describe('buildContinuationPack', () => {
  it('creates a redacted handoff pack that can restart work in another agent', () => {
    const session: AgentSession = {
      id: 'session-1',
      provider: 'codex',
      title: 'Fix account switch continuity',
      sourcePath: '/tmp/session.jsonl',
      cwd: '/repo/app',
      gitBranch: 'feature/continuity',
      model: 'gpt-5.4',
      createdAt: '2026-07-07T01:00:00.000Z',
      updatedAt: '2026-07-07T01:10:00.000Z',
      messages: [
        {
          role: 'user',
          timestamp: '2026-07-07T01:00:00.000Z',
          content: 'Use OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123456789SECRET to test'
        },
        {
          role: 'assistant',
          timestamp: '2026-07-07T01:10:00.000Z',
          content: 'Next: wire the recovery action and run npm test.'
        }
      ]
    };

    const pack = buildContinuationPack(session, {
      generatedAt: '2026-07-07T01:20:00.000Z',
      git: {
        branch: 'feature/continuity',
        head: 'abc1234',
        status: ' M src/app.ts',
        diff: 'diff --git a/src/app.ts b/src/app.ts'
      }
    });

    expect(pack['handoff.md']).toContain('Fix account switch continuity');
    expect(pack['handoff.md']).toContain('Continue this work');
    expect(pack['conversation.md']).toContain('[REDACTED:openai-key]');
    expect(pack['state.json']).toContain('"provider": "codex"');
    expect(pack['git.patch']).toContain('diff --git');
  });
});
