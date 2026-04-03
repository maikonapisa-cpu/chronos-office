import { NextResponse } from 'next/server';
import { getRuntimeHealth } from '@/lib/health';

export async function GET() {
  const health = await getRuntimeHealth();
  return NextResponse.json({
    ok: true,
    telegramWebhookRoute: '/api/telegram/webhook',
    telegramStatusRoute: '/api/telegram/status',
    telegramDebugRoute: '/api/debug/telegram',
    ...health,
  });
}
