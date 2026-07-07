import { join } from 'node:path';

export function resolvePreloadPath(mainDir: string): string {
  return join(mainDir, '../preload/index.mjs');
}
