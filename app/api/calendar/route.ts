import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { loadTokens, oauth2Client } from '@/lib/google';

async function applyTokens(req: NextRequest) {
  const tokenCookie = req.cookies.get('google_tokens')?.value;
  if (tokenCookie) {
    return JSON.parse(tokenCookie);
  }

  const fileTokens = await loadTokens();
  return fileTokens;
}

export async function GET(req: NextRequest) {
  const tokens = await applyTokens(req);

  if (!tokens) {
    return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 });
  }

  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const inNinetyDays = new Date();
  inNinetyDays.setDate(now.getDate() + 90);

  const events = await calendar.events.list({
    calendarId: 'primary',
    maxResults: 50,
    singleEvents: true,
    orderBy: 'startTime',
    timeMin: now.toISOString(),
    timeMax: inNinetyDays.toISOString(),
  });

  return NextResponse.json({
    events: events.data.items ?? [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const tokens = await applyTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 });
    }

    oauth2Client.setCredentials(tokens);

    const body = await req.json();
    const { summary, date, time, endTime, description } = body as {
      summary?: string;
      date?: string;
      time?: string;
      endTime?: string;
      description?: string;
    };

    if (!summary || !date) {
      return NextResponse.json(
        { error: 'Missing summary or date' },
        { status: 400 }
      );
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const hasTime = Boolean(time);
    const startIso = hasTime ? new Date(`${date}T${time}:00`).toISOString() : undefined;
    const endIso = hasTime
      ? new Date(`${date}T${(endTime || time || '12:00')}:00`).toISOString()
      : undefined;
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const created = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        ...(hasTime
          ? { start: { dateTime: startIso }, end: { dateTime: endIso } }
          : { start: { date: date }, end: { date: endDate.toISOString().slice(0, 10) } }),
      },
    });

    return NextResponse.json({ event: created.data });
  } catch (error) {
    console.error('Create calendar event failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Create calendar event failed', detail: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tokens = await applyTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 });
    }

    oauth2Client.setCredentials(tokens);

    const body = await req.json();
    const { eventId } = body as { eventId?: string };

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId' },
        { status: 400 }
      );
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    return NextResponse.json({ ok: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Delete calendar event failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Delete calendar event failed', detail: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tokens = await applyTokens(req);
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Google' }, { status: 401 });
    }

    oauth2Client.setCredentials(tokens);

    const body = await req.json();
    const { eventId, summary, date, time, endTime, description } = body as {
      eventId?: string;
      summary?: string;
      date?: string;
      time?: string;
      endTime?: string;
      description?: string;
    };

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId' },
        { status: 400 }
      );
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const hasTime = Boolean(time);
    const startIso = hasTime ? new Date(`${date}T${time}:00`).toISOString() : undefined;
    const endIso = hasTime
      ? new Date(`${date}T${(endTime || time || '12:00')}:00`).toISOString()
      : undefined;
    const endDate = new Date(date || new Date());
    endDate.setDate(endDate.getDate() + 1);

    const updated = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary,
        description,
        ...(date && hasTime
          ? { start: { dateTime: startIso }, end: { dateTime: endIso } }
          : date
          ? { start: { date }, end: { date: endDate.toISOString().slice(0, 10) } }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, event: updated.data });
  } catch (error) {
    console.error('Update calendar event failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Update calendar event failed', detail: message },
      { status: 500 }
    );
  }
}
