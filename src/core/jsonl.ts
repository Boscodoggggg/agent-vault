export interface JsonLineParseResult {
  records: unknown[];
  errors: Array<{ line: number; message: string; raw: string }>;
}

export function parseJsonLines(input: string): JsonLineParseResult {
  const records: unknown[] = [];
  const errors: Array<{ line: number; message: string; raw: string }> = [];

  input.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      records.push(JSON.parse(trimmed));
    } catch (error) {
      errors.push({
        line: index + 1,
        message: error instanceof Error ? error.message : 'Invalid JSON',
        raw: line
      });
    }
  });

  return { records, errors };
}
