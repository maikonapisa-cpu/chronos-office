import fs from 'fs/promises';
import path from 'path';

const logPath = path.join(process.cwd(), 'data', 'telegram-receipts.log');

export async function appendReceipt(entry: unknown) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    entry,
  });
  await fs.appendFile(logPath, line + '\n', 'utf8');
}

export async function readReceipts(limit = 20) {
  try {
    const raw = await fs.readFile(logPath, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { at: null, entry: line };
      }
    });
  } catch {
    return [];
  }
}
