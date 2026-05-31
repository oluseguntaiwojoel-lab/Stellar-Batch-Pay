export function canonicalizeIdempotencyPayload(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return entries.reduce<Record<string, unknown>>((accumulator, [key, entryValue]) => {
      accumulator[key] = normalizeValue(entryValue);
      return accumulator;
    }, {});
  }

  return value;
}