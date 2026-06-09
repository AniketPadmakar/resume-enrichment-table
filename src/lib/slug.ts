import { customAlphabet } from "nanoid";

// Lowercase alphanumeric, no ambiguous chars — readable public link tokens (/p/<slug>).
const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
const nano = customAlphabet(alphabet, 8);

export function newSlug(): string {
  return nano();
}
