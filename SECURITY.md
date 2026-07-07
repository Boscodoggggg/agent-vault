# Security

## Supported Versions

Agent Vault is pre-1.0. Security fixes target the latest `main` branch until release channels exist.

## Reporting a Vulnerability

Please do not open public issues containing credentials, private transcripts, or proprietary code.

Open a private security advisory on GitHub or contact the maintainer with:

- Impact summary
- Reproduction steps using synthetic data
- Affected version or commit
- Suggested fix, if known

## Security Boundaries

Agent Vault does not attempt to bypass Codex, Claude Code, or any provider's account separation. It reads local transcript files and creates explicit handoff artifacts.

Best-effort redaction is not a substitute for review. Treat generated packs as sensitive until inspected.
