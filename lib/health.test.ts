import assert from 'node:assert/strict';
import test from 'node:test';

function shouldRelay(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return false;
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

test('system relay sanity', () => {
  assert.equal(shouldRelay('add lunch with my dad tomorrow from 1 PM to 2 PM'), true);
  assert.equal(shouldRelay('hello chris'), false);
});
