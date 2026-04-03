import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
const tokensPath = path.join(process.cwd(), 'data', 'google-tokens.json');

export const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
}

export async function saveTokens(tokens: unknown) {
  await fs.mkdir(path.dirname(tokensPath), { recursive: true });
  await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2), 'utf8');
}

export async function loadTokens() {
  try {
    const raw = await fs.readFile(tokensPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

export function isLikelyCalendarCommand(text: string) {
  const lower = normalizeText(text).toLowerCase();
  return (
    lower.includes('calendar') ||
    lower.includes('schedule') ||
    lower.includes('add ') ||
    lower.includes('move ') ||
    lower.includes('reschedule') ||
    lower.includes('tomorrow') ||
    lower.includes('next week') ||
    lower.includes('today') ||
    lower.includes('lunch') ||
    lower.includes('meeting') ||
    lower.includes('birthday') ||
    /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(text)
  );
}

export function formatReply(title: string, start?: string) {
  return `Status: added successfully\nTitle: ${title}${start ? `\nWhen: ${start}` : ''}`;
}
