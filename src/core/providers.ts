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
    const effectiveRecord = unwrapPayloadRecord(record);
    const git = asRecord(effectiveRecord.git);

    id =
      firstString(
        effectiveRecord.sessionId,
        effectiveRecord.session_id,
        effectiveRecord.threadId,
        effectiveRecord.thread_id,
        effectiveRecord.id,
        record.sessionId,
        record.id
      ) ?? id;
    cwd =
      cwd ??
      firstString(effectiveRecord.cwd, effectiveRecord.workingDirectory, effectiveRecord.working_directory, record.cwd);
    gitBranch =
      gitBranch ??
      firstString(effectiveRecord.gitBranch, effectiveRecord.git_branch, effectiveRecord.branch, git?.branch);
    model =
      model ??
      firstString(effectiveRecord.model, effectiveRecord.modelId, effectiveRecord.model_id, effectiveRecord.model_provider);

    const timestamp = firstString(effectiveRecord.timestamp, record.timestamp, record.createdAt, record.created_at);
    createdAt = earliestIso(createdAt, timestamp);
    updatedAt = latestIso(updatedAt, timestamp);

    const role = inferRole(effectiveRecord);
    if (!role || role === 'system') continue;

    const messageRecord = asRecord(effectiveRecord.message);
    const text = [
      contentToText(messageRecord?.content),
      contentToText(messageRecord?.text),
      contentToText(effectiveRecord.content),
      contentToText(effectiveRecord.text),
      contentToText(effectiveRecord.message),
      contentToText(effectiveRecord.output),
      contentToText(effectiveRecord.item)
    ]
      .find(Boolean)
      ?.trim();

    if (!text) continue;
    if (isSyntheticContextMessage(role, text)) continue;

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

function isSyntheticContextMessage(role: string, text: string): boolean {
  if (role !== 'user') return false;
  const normalized = text.trim();
  return normalized.startsWith('<environment_context>') || normalized.startsWith('<user_instructions>');
}

function unwrapPayloadRecord(record: Record<string, unknown>): Record<string, unknown> {
  const payload = asRecord(record.payload);
  if (!payload) return record;

  return {
    ...payload,
    timestamp: firstString(payload.timestamp, record.timestamp),
    outerType: record.type
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
