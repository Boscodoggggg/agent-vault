import { describe, expect, it } from 'vitest';
import { redactSensitiveText } from '../src/core/redact';

describe('redactSensitiveText', () => {
  it('removes common API keys and bearer tokens without destroying useful context', () => {
    const text = [
      'OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123456789SECRET',
      'Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'The failing test is still auth.spec.ts'
    ].join('\n');

    const redacted = redactSensitiveText(text);

    expect(redacted).toContain('[REDACTED:openai-key]');
    expect(redacted).toContain('[REDACTED:bearer-token]');
    expect(redacted).toContain('auth.spec.ts');
    expect(redacted).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz');
    expect(redacted).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz');
  });
});
