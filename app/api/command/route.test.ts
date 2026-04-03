import assert from 'node:assert/strict';
import test from 'node:test';

function parseCommand(text: string) {
  const input = text.replace(/\s+/g, ' ').trim();
  const lower = input.toLowerCase();
  const now = new Date();

  let date = new Date(now);
  if (lower.includes('tomorrow')) date.setDate(date.getDate() + 1);
  else if (lower.includes('today')) date = new Date(now);
  else if (lower.includes('next week')) date.setDate(date.getDate() + 7);

  const explicitDate = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicitDate?.[1]) date = new Date(explicitDate[1]);

  const timeMatch = input.match(/(?:at\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  let startTime = '12:00';
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] || '00';
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    startTime = `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const endMatch = input.match(/(?:to|until)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let endTime = '13:00';
  if (endMatch) {
    let hour = Number(endMatch[1]);
    const minute = endMatch[2] || '00';
    const meridiem = endMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    endTime = `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const summary = input
    .replace(/\b(add|schedule|create|reminder|tomorrow|today|next week)\b/ig, ' ')
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/, ' ')
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/ig, ' ')
    .replace(/\b(?:to|until)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { summary: summary || input, date: date.toISOString().slice(0, 10), time: startTime, endTime };
}

test('parseCommand handles tomorrow time range', () => {
  const parsed = parseCommand('add lunch with my dad tomorrow from 1 PM to 2 PM');
  assert.equal(parsed.summary.toLowerCase().includes('lunch with my dad'), true);
  assert.equal(parsed.time, '13:00');
  assert.equal(parsed.endTime, '14:00');
});

test('parseCommand handles explicit dates', () => {
  const parsed = parseCommand('schedule meeting 2026-04-05 at 3 pm to 4 pm');
  assert.equal(parsed.date, '2026-04-05');
  assert.equal(parsed.time, '15:00');
  assert.equal(parsed.endTime, '16:00');
});
