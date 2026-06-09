import { customAlphabet } from "nanoid";

const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
const nano = customAlphabet(alphabet, 8);

export function newSlug(): string {
  return nano();
}
