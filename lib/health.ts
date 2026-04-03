import { loadTokens } from '@/lib/google';
import { readReceipts } from '@/lib/logging';

export async function getRuntimeHealth() {
  const tokens = await loadTokens();
  const receipts = await readReceipts(5);
  return {
    googleConnected: Boolean(tokens),
    receiptCount: receipts.length,
    hasRecentReceipt: receipts.length > 0,
  };
}
