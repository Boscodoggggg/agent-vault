import type { AgentRole } from './types';

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function contentToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => contentToText(item))
      .filter(Boolean)
      .join('\n');
  }

  const record = asRecord(value);
  if (!record) return '';

  if (typeof record.text === 'string') return record.text;
  if (typeof record.content === 'string') return record.content;
  if (Array.isArray(record.content)) return contentToText(record.content);
  if (typeof record.output === 'string') return record.output;
  if (typeof record.name === 'string' && record.type === 'tool_use') {
    const toolInput = record.input ? ` ${JSON.stringify(record.input)}` : '';
    return `[tool:${record.name}]${toolInput}`;
  }
  if (typeof record.type === 'string' && typeof record.id === 'string') return `[${record.type}:${record.id}]`;

  return '';
}

export function inferRole(record: Record<string, unknown>): AgentRole | undefined {
  if (record.role === 'user' || record.role === 'assistant' || record.role === 'tool' || record.role === 'system') {
    return record.role;
  }

  const message = asRecord(record.message);
  if (
    message?.role === 'user' ||
    message?.role === 'assistant' ||
    message?.role === 'tool' ||
    message?.role === 'system'
  ) {
    return message.role;
  }

  const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
  if (type.includes('user')) return 'user';
  if (type.includes('assistant') || type.includes('agent')) return 'assistant';
  if (type.includes('tool') || type.includes('function')) return 'tool';
  if (type.includes('system') || type.includes('context')) return 'system';

  return undefined;
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}
