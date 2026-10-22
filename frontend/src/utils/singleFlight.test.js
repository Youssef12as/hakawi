import test from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlight } from './singleFlight.js';

test('replayed chat initialization sends one request and shares the session', async () => {
  const run = createSingleFlight();
  let requests = 0;
  const create = async () => ({ session_id: `session-${++requests}` });
  const first = run('monument-a', create);
  const replay = run('monument-a', create);
  assert.equal(first, replay);
  assert.deepEqual(await Promise.all([first, replay]), [
    { session_id: 'session-1' }, { session_id: 'session-1' },
  ]);
  assert.equal(requests, 1);
});

test('different chats and different mounted callers do not share sessions', async () => {
  const first = createSingleFlight();
  const second = createSingleFlight();
  let requests = 0;
  const create = async () => ++requests;
  assert.deepEqual(await Promise.all([
    first('monument-a', create), first('monument-b', create), second('monument-a', create),
  ]), [1, 2, 3]);
});

test('failed initialization can be retried and a later new chat is allowed', async () => {
  const run = createSingleFlight();
  await assert.rejects(run('chat', () => { throw new Error('offline'); }), /offline/);
  assert.equal(await run('chat', async () => 'retry-session'), 'retry-session');
  assert.equal(await run('chat', async () => 'new-session'), 'new-session');
});
