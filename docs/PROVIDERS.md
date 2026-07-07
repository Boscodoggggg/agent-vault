# Provider Notes

## Codex

Current adapter:

```text
~/.codex/sessions/**/*.jsonl
```

The parser handles common user, assistant, agent, tool, and context event shapes. It treats malformed JSONL lines as recoverable parse errors.

## Claude Code

Current adapter:

```text
~/.claude/projects/**/*.jsonl
```

The parser extracts user and assistant messages from `message.content`, including text blocks.

## Adding Providers

A provider should expose:

- Session ID
- Provider name
- Source path
- Optional project path
- Optional branch and model
- Ordered messages

Use synthetic fixtures in tests. Do not commit real transcripts.
