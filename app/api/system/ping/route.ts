import { NextResponse } from 'next/server';
import { getRuntimeHealth } from '@/lib/health';

export async function GET() {
  const health = await getRuntimeHealth();
  const ready = health.googleConnected && health.hasRecentReceipt;
  return NextResponse.json({
    ok: true,
    ready,
    telegramWebhookRoute: '/api/telegram/webhook',
    telegramSetWebhookRoute: '/api/telegram/set-webhook',
    telegramStatusRoute: '/api/telegram/status',
    telegramHealthRoute: '/api/telegram/health',
    telegramDebugRoute: '/api/debug/telegram',
    ...health,
  });
}
