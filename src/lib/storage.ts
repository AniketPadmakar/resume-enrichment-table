import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseDir = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function storeFile(key: string, data: Buffer): Promise<string> {
  const full = resolve(baseDir, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}
