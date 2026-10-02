import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queueJobRequest } from '../src/services/jobRequestQueue.js';

test('17개 지역 요청은 최대 2개씩 실행되고 결과 순서를 유지한다', async () => {
  let active = 0;
  let peak = 0;
  const results = await Promise.all(Array.from({ length: 17 }, (_, index) => queueJobRequest(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return index;
  })));
  assert.equal(peak, 2);
  assert.deepEqual(results, Array.from({ length: 17 }, (_, index) => index));
});

test('대기 중 취소된 요청은 실행하지 않으며 실패 후에도 다음 요청을 처리한다', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const first = queueJobRequest(() => gate);
  const second = queueJobRequest(() => gate);
  const controller = new AbortController();
  let ran = false;
  const canceled = queueJobRequest(() => { ran = true; }, controller.signal);
  const rejection = assert.rejects(canceled, { name: 'AbortError' });
  controller.abort();
  release();
  await Promise.all([first, second, rejection]);
  assert.equal(ran, false);
  await assert.rejects(queueJobRequest(() => Promise.reject(new Error('test'))));
  assert.equal(await queueJobRequest(() => 42), 42);
});
