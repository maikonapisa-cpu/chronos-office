import assert from 'node:assert/strict';
import test from 'node:test';

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function shouldRelayTelegramText(text: string) {
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

test('relay decision accepts calendar-like text', () => {
  assert.equal(shouldRelayTelegramText('add lunch with my dad tomorrow from 1 PM to 2 PM'), 'relay');
  assert.equal(shouldRelayTelegramText('schedule meeting tomorrow at 3 pm'), 'relay');
});

test('relay decision ignores random chat', () => {
  assert.equal(shouldRelayTelegramText('hello chris'), 'ignore');
  assert.equal(shouldRelayTelegramText('test relay'), 'ignore');
});

test('relay decision ignores empty text', () => {
  assert.equal(shouldRelayTelegramText('   '), 'ignore');
});
