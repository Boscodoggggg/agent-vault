import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function findJsonlFiles(root: string): Promise<string[]> {
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
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          return;
        }
        if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(fullPath);
      })
    );
  }

  await walk(root);
  return files.sort();
}
