// Display-name sanitising. Mirrors the server rules (the server additionally applies a profanity list).
// Removes control, bidi-override/isolate/mark and zero-width characters, collapses spaces, trims.
// Ranges: C0/C1 controls, ALM (061C), zero-width + LRM/RLM (200B-200F), bidi embeddings/overrides (202A-202E),
// word joiner..bidi isolates (2060-2069), BOM (FEFF).
const STRIP = new RegExp(
  '[' +
    '\\u0000-\\u001F\\u007F-\\u009F' +
    '\\u061C' +
    '\\u200B-\\u200F' +
    '\\u202A-\\u202E' +
    '\\u2060-\\u2069' +
    '\\uFEFF' +
    ']',
  'g',
);

export const NAME_MIN = 2;
export const NAME_MAX = 24;

export function sanitizeName(raw: string): string {
  return raw.replace(/[\t\n\r]/g, ' ').replace(STRIP, '').replace(/\s+/g, ' ').trim();
}

export function isValidName(name: string): boolean {
  const n = sanitizeName(name);
  const len = Array.from(n).length;
  return len >= NAME_MIN && len <= NAME_MAX;
}
