import { describe, expect, it } from 'vitest';
import { resolvePreloadPath } from '../src/main/paths';

describe('resolvePreloadPath', () => {
  it('points to the Electron Vite preload output file', () => {
    expect(resolvePreloadPath('/app/out/main')).toBe('/app/out/preload/index.mjs');
  });
});
