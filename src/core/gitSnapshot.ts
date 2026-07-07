import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitSnapshot } from './types';

const execFileAsync = promisify(execFile);

export async function captureGitSnapshot(cwd: string | undefined): Promise<GitSnapshot | undefined> {
  if (!cwd) return undefined;

  try {
    const [branch, head, status, diff] = await Promise.all([
      git(cwd, ['branch', '--show-current']),
      git(cwd, ['rev-parse', '--short', 'HEAD']),
      git(cwd, ['status', '--short']),
      git(cwd, ['diff', '--binary'])
    ]);

    return {
      branch: branch.trim() || undefined,
      head: head.trim() || undefined,
      status: status.trim() || undefined,
      diff: diff.trim() || undefined
    };
  } catch {
    return undefined;
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}
