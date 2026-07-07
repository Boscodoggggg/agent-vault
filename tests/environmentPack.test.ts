import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanEnvironmentAssets, writeEnvironmentPack } from '../src/core/environmentPack';

const fixtureHome = join(process.cwd(), '.tmp-environment-test');

describe('environment packs', () => {
  afterEach(async () => {
    await rm(fixtureHome, { recursive: true, force: true });
  });

  it('discovers portable Codex and Claude Code assets while excluding auth state', async () => {
    await mkdir(join(fixtureHome, '.codex/skills/recover-work'), { recursive: true });
    await mkdir(join(fixtureHome, '.claude/commands'), { recursive: true });
    await mkdir(join(fixtureHome, '.claude/agents/reviewer'), { recursive: true });

    await writeFile(join(fixtureHome, '.codex/skills/recover-work/SKILL.md'), '# Recover Work\n', 'utf8');
    await writeFile(
      join(fixtureHome, '.codex/config.toml'),
      'mcp_token = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789SECRET"',
      'utf8'
    );
    await writeFile(join(fixtureHome, '.codex/auth.json'), '{"access_token":"secret"}', 'utf8');
    await writeFile(join(fixtureHome, '.claude/CLAUDE.md'), '# Global Claude Memory\n', 'utf8');
    await writeFile(join(fixtureHome, '.claude/commands/review.md'), 'Review this diff', 'utf8');
    await writeFile(join(fixtureHome, '.claude/agents/reviewer/agent.md'), 'You review changes.', 'utf8');
    await writeFile(join(fixtureHome, '.claude/.env'), 'TOKEN=secret', 'utf8');

    const assets = await scanEnvironmentAssets({ homeDir: fixtureHome });

    expect(assets.map((asset) => asset.relativePath).sort()).toEqual([
      '.claude/CLAUDE.md',
      '.claude/agents/reviewer/agent.md',
      '.claude/commands/review.md',
      '.codex/config.toml',
      '.codex/skills/recover-work/SKILL.md'
    ]);
    expect(assets.some((asset) => asset.sourcePath.endsWith('auth.json'))).toBe(false);
    expect(assets.some((asset) => asset.sourcePath.endsWith('.env'))).toBe(false);
  });

  it('writes a redacted portable environment pack with a manifest', async () => {
    await mkdir(join(fixtureHome, '.codex/skills/recover-work'), { recursive: true });
    await writeFile(join(fixtureHome, '.codex/skills/recover-work/SKILL.md'), '# Recover Work\n', 'utf8');
    await writeFile(
      join(fixtureHome, '.codex/config.toml'),
      'api_key = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789SECRET"',
      'utf8'
    );

    const outputDir = join(fixtureHome, 'pack');
    const result = await writeEnvironmentPack({
      homeDir: fixtureHome,
      outputDir,
      generatedAt: '2026-07-07T10:00:00.000Z'
    });

    const manifest = await readFile(join(outputDir, 'manifest.json'), 'utf8');
    const config = await readFile(join(outputDir, 'assets/.codex/config.toml'), 'utf8');

    expect(result.assets).toHaveLength(2);
    expect(manifest).toContain('"schemaVersion": 1');
    expect(manifest).toContain('"kind": "settings"');
    expect(config).toContain('[REDACTED:openai-key]');
    expect(config).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz');
  });
});
