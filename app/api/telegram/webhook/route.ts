import { NextRequest, NextResponse } from 'next/server';
import { appendReceipt } from '@/lib/logging';
import { formatReply, normalizeText } from '@/lib/google';
import { shouldRelayTelegramText } from '@/lib/relay';

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram sendMessage failed: ${errText}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    await appendReceipt({ type: 'telegram-update', update });

    const message = update?.message ?? update?.edited_message ?? update?.channel_post;
    const text = normalizeText(String(message?.text || message?.caption || ''));
    const chatId = String(message?.chat?.id || '');

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'missing_chat' });
    }

    if (!text) {
      const reply = 'Status: received\nAction: no text found';
      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true, ignored: true, reason: 'missing_text', reply });
    }

    if (shouldRelayTelegramText(text) !== 'relay') {
      const reply = 'Status: ignored\nReason: not a calendar-style message';
      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true, ignored: true, reason: 'not_calendar', reply });
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorText = data?.detail || data?.error || 'unknown error';
      const reply = `Status: failed\nReason: ${errorText}`;
      await sendTelegramMessage(chatId, reply);
      await appendReceipt({ type: 'telegram-relay-error', chatId, text, error: data });
      return NextResponse.json({ ok: false, reply, error: data }, { status: 500 });
    }

    const reply = data?.reply || formatReply(data?.event?.summary || 'event', data?.event?.start?.dateTime || data?.event?.start?.date || '');
    await sendTelegramMessage(chatId, reply);
    await appendReceipt({ type: 'telegram-relay-success', chatId, text, reply });

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    console.error('Telegram relay failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
