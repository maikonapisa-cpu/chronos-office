import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { appendReceipt } from '@/lib/logging';
import {
  formatReply,
  isLikelyCalendarCommand,
  loadTokens,
  normalizeText,
  oauth2Client,
} from '@/lib/google';

function parseCommand(text: string) {
  const input = normalizeText(text);
  const lower = input.toLowerCase();
  const now = new Date();

  let date = new Date(now);
  let isAllDay = false;

  // Check if it's an all-day event
  if (/all\s*day|whole\s*day|birthday|anniversary/i.test(input)) {
    isAllDay = true;
  }

  // Parse relative dates
  if (lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes('today')) {
    date = new Date(now);
  } else if (lower.includes('next week')) {
    date.setDate(date.getDate() + 7);
  } else if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(input)) {
    const dayMatch = input.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayMatch[1].toLowerCase());
      const currentDay = date.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      date.setDate(date.getDate() + daysAhead);
    }
  } else {
    // Try to parse month + day format: "may 18", "december 25", etc.
    const monthMatch = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
    if (monthMatch) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = months.indexOf(monthMatch[1].toLowerCase());
      const day = Number(monthMatch[2]);
      date.setMonth(monthIndex);
      date.setDate(day);
      // If the date is in the past this year, assume next year
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
  }

  // Check for explicit ISO date format (YYYY-MM-DD)
  const explicitDate = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicitDate?.[1]) date = new Date(explicitDate[1]);

  // Parse times
  let startTime = isAllDay ? '00:00' : '12:00';
  let endTime = isAllDay ? '23:59' : '13:00';

  if (!isAllDay) {
    // Look for time patterns with am/pm (most reliable): "1 PM", "8 AM", etc.
    // This regex specifically looks for times with am/pm attached
    const timeWithMeridiem = input.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (timeWithMeridiem) {
      let hour = Number(timeWithMeridiem[1]);
      const minute = timeWithMeridiem[2] || '00';
      const meridiem = timeWithMeridiem[3]?.toLowerCase();
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      startTime = `${String(hour).padStart(2, '0')}:${minute}`;

      // Look for end time: "X PM to Y PM", "X AM to Y AM", etc.
      const endMatch = input.match(/(?:to|-|until|through)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
      if (endMatch) {
        let endHour = Number(endMatch[1]);
        const endMinute = endMatch[2] || '00';
        const endMeridiem = endMatch[3]?.toLowerCase();
        if (endMeridiem === 'pm' && endHour < 12) endHour += 12;
        if (endMeridiem === 'am' && endHour === 12) endHour = 0;
        endTime = `${String(endHour).padStart(2, '0')}:${endMinute}`;
      } else {
        // Default end time: 1 hour after start
        const endDate = new Date(date);
        endDate.setHours(Number(startTime.slice(0, 2)) + 1);
        endDate.setMinutes(Number(startTime.slice(3, 5)));
        endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      }
    }
  }

  // Extract event title by removing date/time keywords
  let summary = input
    .replace(/\b(add|schedule|create|reminder)\b/gi, '')
    .replace(/\b(tomorrow|today|tonight|next week)\b/gi, '')
    .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
    .replace(/\bnext\s+\w+/gi, '')
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b(?:to|-|until|through)\b/gi, '')
    .replace(/\b(all\s*day|whole\s*day|birthday|anniversary)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!summary) summary = input;

  return { summary, date: date.toISOString().slice(0, 10), time: startTime, endTime, isAllDay };
}

async function getTokens(req: NextRequest) {
  const tokenCookie = req.cookies.get('google_tokens')?.value;
  if (tokenCookie) return JSON.parse(tokenCookie);
  return await loadTokens();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text || '').trim();

    await appendReceipt({ type: 'command', text });

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    if (!isLikelyCalendarCommand(text)) {
      return NextResponse.json({ error: 'Not a calendar command' }, { status: 400 });
    }

    const tokens = await getTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 });
    }

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const parsed = parseCommand(text);
    const endDate = new Date(parsed.date);
    endDate.setDate(endDate.getDate() + 1);

    // Determine if it's a timed event or all-day
    const isTimed = !parsed.isAllDay && /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(text);

    const created = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: parsed.summary,
        start: isTimed ? { dateTime: new Date(`${parsed.date}T${parsed.time}:00`).toISOString() } : { date: parsed.date },
        end: isTimed ? { dateTime: new Date(`${parsed.date}T${parsed.endTime}:00`).toISOString() } : { date: endDate.toISOString().slice(0, 10) },
      },
    });

    const reply = formatReply(parsed.summary, created.data.start?.dateTime || created.data.start?.date || '');
    await appendReceipt({ type: 'command-result', ok: true, parsed, event: created.data, reply });

    return NextResponse.json({ ok: true, event: created.data, parsed, reply });
  } catch (error) {
    console.error('Command endpoint failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    await appendReceipt({ type: 'command-error', error: message });
    return NextResponse.json({ error: 'Command failed', detail: message }, { status: 500 });
  }
}
