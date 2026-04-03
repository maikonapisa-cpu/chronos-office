import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    return NextResponse.json({ ok: true, telegram: data });
  } catch (error) {
    console.error('Telegram status failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
