# Contributing

Agent Vault is built around one rule: preserve work without breaking account boundaries.

## Local Setup

```bash
npm install
npm test
npm run typecheck
npm run dev
```

## Provider Adapters

Provider adapters should:

- Read local files only.
- Avoid auth caches and tokens.
- Normalize into `AgentSession`.
- Keep malformed JSONL line errors non-fatal.
- Redact secrets before user-facing output.
- Include synthetic fixtures in tests, never real transcripts.

## Pull Requests

Before opening a PR:

- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Update docs when behavior changes.

Small, provider-focused PRs are easier to review than large rewrites.
