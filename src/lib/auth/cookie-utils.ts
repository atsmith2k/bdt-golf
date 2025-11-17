export function extractCookie(header: string, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq > -1) {
      const key = trimmed.substring(0, eq);
      const value = trimmed.substring(eq + 1);
      if (key === name) return decodeURIComponent(value);
    }
  }
  return undefined;
}