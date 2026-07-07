import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redactSensitiveText } from './redact';
import type { AgentSession, GitSnapshot } from './types';

export interface BuildContinuationPackOptions {
  generatedAt?: string;
  git?: GitSnapshot;
}

export type ContinuationPack = Record<string, string>;

export function buildContinuationPack(
  session: AgentSession,
  options: BuildContinuationPackOptions = {}
): ContinuationPack {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const git = options.git;
  const conversation = formatConversation(session);

  return {
    'handoff.md': buildHandoff(session, generatedAt, git),
    'conversation.md': conversation,
    'state.json': `${JSON.stringify(buildState(session, generatedAt, git), null, 2)}\n`,
    'next_steps.md': buildNextSteps(session),
    'verification.md': buildVerification(session, git),
    'files_changed.md': buildFilesChanged(git),
    'git.patch': git?.diff ? redactSensitiveText(git.diff) : ''
  };
}

export async function writeContinuationPack(
  session: AgentSession,
  outputDir: string,
  options: BuildContinuationPackOptions = {}
): Promise<string[]> {
  const pack = buildContinuationPack(session, options);
  await mkdir(outputDir, { recursive: true });

  const written: string[] = [];
  for (const [fileName, content] of Object.entries(pack)) {
    const path = join(outputDir, fileName);
    await writeFile(path, content, 'utf8');
    written.push(path);
  }

  return written;
}

function buildHandoff(session: AgentSession, generatedAt: string, git?: GitSnapshot): string {
  return [
    `# Continue this work: ${session.title}`,
    '',
    `Generated: ${generatedAt}`,
    `Source: ${session.provider}`,
    session.cwd ? `Project: \`${session.cwd}\`` : undefined,
    session.gitBranch || git?.branch ? `Branch: \`${session.gitBranch ?? git?.branch}\`` : undefined,
    session.model ? `Model: \`${session.model}\`` : undefined,
    git?.head ? `HEAD: \`${git.head}\`` : undefined,
    '',
    '## Instruction for the next agent',
    '',
    'Continue this work from the preserved project state and conversation record. First, read `state.json`, `conversation.md`, and `next_steps.md`. Then inspect the working tree before editing. Preserve existing user changes, explain any risky recovery action, and run the relevant verification commands before reporting completion.',
    '',
    '## What happened most recently',
    '',
    latestAssistantMessage(session) ?? 'No assistant message was captured.',
    '',
    '## Last user request',
    '',
    latestUserMessage(session) ?? 'No user request was captured.',
    ''
  ]
    .filter((line): line is string => line !== undefined)
    .map(redactSensitiveText)
    .join('\n');
}

function buildState(session: AgentSession, generatedAt: string, git?: GitSnapshot): Record<string, unknown> {
  return {
    schemaVersion: 1,
    generatedAt,
    session: {
      id: session.id,
      provider: session.provider,
      title: session.title,
      sourcePath: session.sourcePath,
      cwd: session.cwd,
      gitBranch: session.gitBranch,
      model: session.model,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages.length
    },
    git
  };
}

function formatConversation(session: AgentSession): string {
  const lines = [`# Conversation: ${session.title}`, ''];
  for (const message of session.messages) {
    lines.push(`## ${message.role}${message.timestamp ? ` - ${message.timestamp}` : ''}`);
    lines.push('');
    lines.push(redactSensitiveText(message.content));
    lines.push('');
  }
  return lines.join('\n');
}

function buildNextSteps(session: AgentSession): string {
  const latestAssistant = latestAssistantMessage(session);
  return [
    '# Next Steps',
    '',
    '- Re-open the project and inspect the working tree before editing.',
    '- Read the latest assistant response below for the most recent plan or blocker.',
    '- Re-run verification commands before making new claims.',
    '',
    '## Latest assistant context',
    '',
    latestAssistant ? redactSensitiveText(latestAssistant) : 'No assistant context captured.',
    ''
  ].join('\n');
}

function buildVerification(session: AgentSession, git?: GitSnapshot): string {
  return [
    '# Verification',
    '',
    'Agent Vault captured this pack from local transcripts. It does not assume the work is correct.',
    '',
    '## Suggested checks',
    '',
    '- Review `git.patch` before applying or continuing.',
    '- Run the project test command from the recovered repository.',
    '- Search `conversation.md` for failed commands, TODOs, and blocked work.',
    '',
    '## Captured git status',
    '',
    '```text',
    redactSensitiveText(git?.status ?? 'No git status captured.'),
    '```',
    '',
    `Source session: ${session.provider}/${session.id}`,
    ''
  ].join('\n');
}

function buildFilesChanged(git?: GitSnapshot): string {
  const status = git?.status?.trim();
  return [
    '# Files Changed',
    '',
    status ? 'Derived from `git status --short`:' : 'No file list captured.',
    '',
    status ? '```text' : '',
    status ? redactSensitiveText(status) : '',
    status ? '```' : '',
    ''
  ]
    .filter(Boolean)
    .join('\n');
}

function latestUserMessage(session: AgentSession): string | undefined {
  return [...session.messages].reverse().find((message) => message.role === 'user')?.content;
}

function latestAssistantMessage(session: AgentSession): string | undefined {
  return [...session.messages].reverse().find((message) => message.role === 'assistant')?.content;
}
