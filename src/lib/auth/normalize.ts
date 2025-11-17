export function isEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

export function normalizeIdentifierForAuth(input: string): string {
  const trimmed = input.trim();
  if (isEmail(trimmed)) {
    return trimmed;
  }
  return trimmed.toLowerCase();
}