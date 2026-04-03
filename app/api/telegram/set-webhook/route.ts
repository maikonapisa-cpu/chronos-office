import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = String(body?.url || process.env.TELEGRAM_WEBHOOK_URL || '').trim();

    if (!url) {
      return NextResponse.json({ error: 'Missing webhook url' }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        drop_pending_updates: true,
        allowed_updates: ['message', 'edited_message', 'channel_post'],
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: res.ok, url, telegram: data });
  } catch (error) {
    console.error('Telegram set-webhook failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
