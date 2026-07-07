import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { redactSensitiveText } from './redact';

export type EnvironmentProvider = 'codex' | 'claude-code';

export type EnvironmentAssetKind =
  'skill' | 'agent' | 'command' | 'settings' | 'instruction' | 'hook' | 'prompt' | 'mcp' | 'other';

export interface EnvironmentAsset {
  id: string;
  provider: EnvironmentProvider;
  kind: EnvironmentAssetKind;
  sourcePath: string;
  relativePath: string;
  byteSize: number;
  redaction: 'applied';
}

export interface EnvironmentPackResult {
  outputDir: string;
  assets: EnvironmentAsset[];
  files: string[];
}

export interface EnvironmentPackOptions {
  homeDir?: string;
  outputDir?: string;
  generatedAt?: string;
}

interface ScanRoot {
  provider: EnvironmentProvider;
  rootPath: string;
  relativeRoot: string;
}

const MAX_ASSET_BYTES = 1024 * 1024;

const CODEX_ROOTS = (homeDir: string): ScanRoot[] => [
  { provider: 'codex', rootPath: join(homeDir, '.codex', 'config.toml'), relativeRoot: '.codex/config.toml' },
  { provider: 'codex', rootPath: join(homeDir, '.codex', 'skills'), relativeRoot: '.codex/skills' },
  { provider: 'codex', rootPath: join(homeDir, '.codex', 'prompts'), relativeRoot: '.codex/prompts' },
  { provider: 'codex', rootPath: join(homeDir, '.codex', 'hooks'), relativeRoot: '.codex/hooks' }
];

const CLAUDE_ROOTS = (homeDir: string): ScanRoot[] => [
  { provider: 'claude-code', rootPath: join(homeDir, '.claude', 'CLAUDE.md'), relativeRoot: '.claude/CLAUDE.md' },
  {
    provider: 'claude-code',
    rootPath: join(homeDir, '.claude', 'settings.json'),
    relativeRoot: '.claude/settings.json'
  },
  { provider: 'claude-code', rootPath: join(homeDir, '.claude', 'commands'), relativeRoot: '.claude/commands' },
  { provider: 'claude-code', rootPath: join(homeDir, '.claude', 'agents'), relativeRoot: '.claude/agents' },
  { provider: 'claude-code', rootPath: join(homeDir, '.claude', 'skills'), relativeRoot: '.claude/skills' },
  { provider: 'claude-code', rootPath: join(homeDir, '.claude', 'hooks'), relativeRoot: '.claude/hooks' }
];

const SENSITIVE_NAME_PATTERNS = [
  /^auth\.json$/i,
  /^\.env/i,
  /credential/i,
  /cookie/i,
  /keychain/i,
  /secret/i,
  /token/i,
  /^sessions?$/i,
  /^projects?$/i,
  /^history\.jsonl$/i,
  /\.local\./i
];

const PORTABLE_TEXT_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.jsonc',
  '.toml',
  '.yaml',
  '.yml',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.sh',
  '.zsh',
  '.fish',
  '.py'
]);

export async function scanEnvironmentAssets(options: EnvironmentPackOptions = {}): Promise<EnvironmentAsset[]> {
  const homeDir = options.homeDir ?? homedir();
  const roots = [...CODEX_ROOTS(homeDir), ...CLAUDE_ROOTS(homeDir)];
  const assets: EnvironmentAsset[] = [];

  for (const root of roots) {
    const files = await collectPortableFiles(root.rootPath);
    for (const file of files) {
      const relativePath = rootRelativePath(root, file);
      const fileStat = await stat(file);
      assets.push({
        id: `${root.provider}:${relativePath}`,
        provider: root.provider,
        kind: inferAssetKind(relativePath),
        sourcePath: file,
        relativePath,
        byteSize: fileStat.size,
        redaction: 'applied'
      });
    }
  }

  return dedupeAssets(assets).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function writeEnvironmentPack(options: EnvironmentPackOptions = {}): Promise<EnvironmentPackResult> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const outputDir = options.outputDir ?? join(homedir(), 'Documents', 'Agent Vault Environment Pack');
  const assets = await scanEnvironmentAssets(options);
  const files: string[] = [];

  await mkdir(outputDir, { recursive: true });

  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(buildManifest(assets, generatedAt), null, 2)}\n`, 'utf8');
  files.push(manifestPath);

  const readmePath = join(outputDir, 'README.md');
  await writeFile(readmePath, buildReadme(generatedAt, assets), 'utf8');
  files.push(readmePath);

  for (const asset of assets) {
    const content = redactSensitiveText(await readFile(asset.sourcePath, 'utf8'));
    const targetPath = join(outputDir, 'assets', asset.relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
    files.push(targetPath);
  }

  return { outputDir, assets, files };
}

async function collectPortableFiles(rootPath: string): Promise<string[]> {
  let rootStat;
  try {
    rootStat = await stat(rootPath);
  } catch {
    return [];
  }

  if (rootStat.isFile()) return isPortableFile(rootPath, rootStat.size) ? [rootPath] : [];
  if (!rootStat.isDirectory()) return [];

  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (isSensitiveName(entry.name)) return;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          return;
        }
        if (!entry.isFile()) return;

        const fileStat = await stat(fullPath);
        if (isPortableFile(fullPath, fileStat.size)) files.push(fullPath);
      })
    );
  }

  await walk(rootPath);
  return files;
}

function rootRelativePath(root: ScanRoot, file: string): string {
  if (root.rootPath === file) return root.relativeRoot;
  return join(root.relativeRoot, relative(root.rootPath, file)).replaceAll('\\', '/');
}

function isPortableFile(path: string, byteSize: number): boolean {
  if (byteSize > MAX_ASSET_BYTES) return false;
  const lower = path.toLowerCase();
  return [...PORTABLE_TEXT_EXTENSIONS].some((extension) => lower.endsWith(extension));
}

function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function inferAssetKind(relativePath: string): EnvironmentAssetKind {
  if (relativePath.includes('/skills/')) return 'skill';
  if (relativePath.includes('/agents/')) return 'agent';
  if (relativePath.includes('/commands/')) return 'command';
  if (relativePath.includes('/hooks/')) return 'hook';
  if (relativePath.includes('/prompts/')) return 'prompt';
  if (relativePath.endsWith('CLAUDE.md') || relativePath.endsWith('AGENTS.md')) return 'instruction';
  if (relativePath.endsWith('config.toml') || relativePath.endsWith('settings.json')) return 'settings';
  if (relativePath.toLowerCase().includes('mcp')) return 'mcp';
  return 'other';
}

function dedupeAssets(assets: EnvironmentAsset[]): EnvironmentAsset[] {
  const byId = new Map<string, EnvironmentAsset>();
  for (const asset of assets) byId.set(asset.id, asset);
  return [...byId.values()];
}

function buildManifest(assets: EnvironmentAsset[], generatedAt: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    generatedAt,
    assetCount: assets.length,
    providers: {
      codex: assets.filter((asset) => asset.provider === 'codex').length,
      'claude-code': assets.filter((asset) => asset.provider === 'claude-code').length
    },
    assets: assets.map(({ id, provider, kind, relativePath, byteSize, redaction }) => ({
      id,
      provider,
      kind,
      relativePath,
      byteSize,
      redaction
    }))
  };
}

function buildReadme(generatedAt: string, assets: EnvironmentAsset[]): string {
  return [
    '# Agent Vault Environment Pack',
    '',
    `Generated: ${generatedAt}`,
    '',
    'This pack contains portable AI agent environment assets such as skills, commands, agents, prompts, hooks, and redacted settings.',
    '',
    'It intentionally excludes auth caches, tokens, cookies, local sessions, transcript history, and machine-local settings.',
    '',
    '## Restore Guidance',
    '',
    '1. Review `manifest.json` and every file under `assets/`.',
    '2. Copy only the assets you want onto the new machine.',
    '3. Re-authenticate Codex, Claude Code, MCP servers, and external services manually.',
    '4. Treat this pack as sensitive until reviewed.',
    '',
    '## Asset Summary',
    '',
    ...assets.map((asset) => `- ${asset.kind}: \`${asset.relativePath}\``),
    ''
  ].join('\n');
}
