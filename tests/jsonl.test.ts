import { describe, expect, it } from 'vitest';
import { parseJsonLines } from '../src/core/jsonl';

describe('parseJsonLines', () => {
  it('keeps valid records and reports malformed lines with line numbers', () => {
    const result = parseJsonLines('{"type":"user"}\nnot-json\n\n{"type":"assistant"}');

    expect(result.records).toEqual([{ type: 'user' }, { type: 'assistant' }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ line: 2 });
  });
});
