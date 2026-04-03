import { normalizeText } from '@/lib/google';

export type RelayDecision = 'relay' | 'ignore';

export function shouldRelayTelegramText(text: string): RelayDecision {
  const normalized = normalizeText(text);
  if (!normalized) return 'ignore';
  const lower = normalized.toLowerCase();
  const looksCalendar =
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
    /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(normalized);
  return looksCalendar ? 'relay' : 'ignore';
}

export function cleanCommandText(text: string) {
  return normalizeText(text);
}
