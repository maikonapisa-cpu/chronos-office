import assert from 'node:assert/strict';
import test from 'node:test';

function shouldRelayTelegramText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
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
    /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(normalized)
  );
}

test('self-check relay readiness', () => {
  assert.equal(shouldRelayTelegramText('add lunch with my dad tomorrow from 1 PM to 2 PM'), true);
  assert.equal(shouldRelayTelegramText('hello chris'), false);
});
