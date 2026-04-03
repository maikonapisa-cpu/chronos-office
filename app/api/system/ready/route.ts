import { NextResponse } from 'next/server';
import { getRuntimeHealth } from '@/lib/health';

export async function GET() {
  const health = await getRuntimeHealth();
  const ready = Boolean(process.env.TELEGRAM_BOT_TOKEN) && health.googleConnected && health.hasRecentReceipt;
  return NextResponse.json({
    ready,
    reason: ready ? 'Everything is connected' : 'One or more pieces are not connected yet',
    nextStep: ready ? 'Send a calendar message to Chris' : 'Check Telegram webhook, Google auth, and recent receipts',
  });
}
