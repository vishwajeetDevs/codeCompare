const JSON_INDENT = 2;

/** Parse and pretty-print JSON. Returns null when the text is not valid JSON. */
export function formatJson(text: string, indent = JSON_INDENT): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, indent);
  } catch {
    return null;
  }
}

export function isValidJson(text: string): boolean {
  return formatJson(text) !== null;
}

/** True when text is valid JSON but not already pretty-printed. */
export function needsJsonFormatting(text: string, indent = JSON_INDENT): boolean {
  const formatted = formatJson(text, indent);
  if (formatted === null) return false;
  return text.trim() !== formatted.trim();
}
