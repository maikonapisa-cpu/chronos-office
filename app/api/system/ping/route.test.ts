import assert from 'node:assert/strict';
import test from 'node:test';

function ready(googleConnected: boolean, hasRecentReceipt: boolean) {
  return googleConnected && hasRecentReceipt;
}

test('ping readiness requires google and receipt history', () => {
  assert.equal(ready(true, true), true);
  assert.equal(ready(true, false), false);
  assert.equal(ready(false, true), false);
});
