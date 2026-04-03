import { NextResponse } from 'next/server';
import { getRuntimeHealth } from '@/lib/health';
import { shouldRelayTelegramText } from '@/lib/relay';

export async function GET() {
  const health = await getRuntimeHealth();
  return NextResponse.json({
    ok: true,
    telegramReady: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    googleReady: health.googleConnected,
    relayReady: shouldRelayTelegramText('add lunch with my dad tomorrow from 1 PM to 2 PM') === 'relay',
    overallReady: Boolean(process.env.TELEGRAM_BOT_TOKEN) && health.googleConnected,
    routes: {
      telegramWebhook: '/api/telegram/webhook',
      telegramSetWebhook: '/api/telegram/set-webhook',
      telegramStatus: '/api/telegram/status',
      telegramHealth: '/api/telegram/health',
      telegramDebug: '/api/debug/telegram',
      systemReady: '/api/system/ready',
      systemPing: '/api/system/ping',
    },
    ...health,
  });
}
