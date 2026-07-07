const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\bsk-proj-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED:openai-key]'],
  [/\bsk-[A-Za-z0-9_-]{24,}\b/g, '[REDACTED:openai-key]'],
  [/Authorization:\s*Bearer\s+[A-Za-z0-9._~+/=-]{20,}/gi, 'Authorization: Bearer [REDACTED:bearer-token]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi, 'Bearer [REDACTED:bearer-token]'],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[REDACTED:github-token]'],
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED:google-key]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED:aws-access-key]'],
  [
    /(api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*=\s*["']?(?!\[REDACTED:)[^"'\s]{12,}/gi,
    '$1=[REDACTED:secret]'
  ]
];

export function redactSensitiveText(input: string): string {
  return REDACTION_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input);
}
