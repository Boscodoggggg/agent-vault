import { basename } from 'node:path';
import { parseJsonLines } from './jsonl';
import { redactSensitiveText } from './redact';
import { asRecord, contentToText, firstString, inferRole } from './text';
import type { AgentMessage, AgentProvider, AgentSession } from './types';

export function parseSessionFile(provider: AgentProvider, sourcePath: string, raw: string): AgentSession | undefined {
  const parsed = parseJsonLines(raw);
  const records = parsed.records.map(asRecord).filter((record): record is Record<string, unknown> => Boolean(record));
  if (records.length === 0 && parsed.errors.length > 0) return undefined;

  const messages: AgentMessage[] = [];
  let id = idFromPath(sourcePath);
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let model: string | undefined;
  let createdAt: string | undefined;
  let updatedAt: string | undefined;

  for (const record of records) {
    id = firstString(record.sessionId, record.session_id, record.threadId, record.thread_id, record.id) ?? id;
    cwd = cwd ?? firstString(record.cwd, record.workingDirectory, record.working_directory);
    gitBranch = gitBranch ?? firstString(record.gitBranch, record.git_branch, record.branch);
    model = model ?? firstString(record.model, record.modelId, record.model_id);

    const timestamp = firstString(record.timestamp, record.createdAt, record.created_at);
    createdAt = earliestIso(createdAt, timestamp);
    updatedAt = latestIso(updatedAt, timestamp);

    const role = inferRole(record);
    if (!role || role === 'system') continue;

    const messageRecord = asRecord(record.message);
    const text = [
      contentToText(messageRecord?.content),
      contentToText(messageRecord?.text),
      contentToText(record.content),
      contentToText(record.text),
      contentToText(record.message),
      contentToText(record.output),
      contentToText(record.item)
    ]
      .find(Boolean)
      ?.trim();

    if (!text) continue;
    messages.push({
      role,
      timestamp,
      content: redactSensitiveText(text)
    });
  }

  const fallbackTime = new Date(0).toISOString();
  const title = makeTitle(messages, provider, id);

  return {
    id,
    provider,
    title,
    sourcePath,
    cwd,
    gitBranch,
    model,
    createdAt: createdAt ?? fallbackTime,
    updatedAt: updatedAt ?? createdAt ?? fallbackTime,
    messages,
    errors: parsed.errors.map(({ line, message }) => ({ line, message }))
  };
}

function idFromPath(sourcePath: string): string {
  return basename(sourcePath).replace(/\.jsonl$/i, '');
}

function makeTitle(messages: AgentMessage[], provider: AgentProvider, id: string): string {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content;
  if (!firstUserMessage) return `${provider} ${id}`;

  const singleLine = firstUserMessage.replace(/\s+/g, ' ').trim();
  return singleLine.length > 72 ? `${singleLine.slice(0, 69)}...` : singleLine;
}

function earliestIso(current: string | undefined, candidate: string | undefined): string | undefined {
  if (!candidate) return current;
  if (!current) return candidate;
  return Date.parse(candidate) < Date.parse(current) ? candidate : current;
}

function latestIso(current: string | undefined, candidate: string | undefined): string | undefined {
  if (!candidate) return current;
  if (!current) return candidate;
  return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}
