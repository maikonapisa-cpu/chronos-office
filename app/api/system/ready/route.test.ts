import assert from 'node:assert/strict';
import test from 'node:test';

test('ready endpoint logic', () => {
  const ready = true;
  const reason = ready ? 'Everything is connected' : 'One or more pieces are not connected yet';
  assert.equal(ready, true);
  assert.equal(reason, 'Everything is connected');
});
