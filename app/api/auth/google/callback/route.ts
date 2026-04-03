import { NextRequest, NextResponse } from 'next/server';
import { oauth2Client, saveTokens } from '@/lib/google';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await saveTokens(tokens);

    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'OAuth callback failed', detail: message },
      { status: 500 }
    );
  }
}
