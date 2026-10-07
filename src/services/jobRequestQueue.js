// 공고 요청 대기줄입니다. 동시에 2개까지만 보내고, 취소된 요청은 줄에서 뺍니다.
const waiting = [];
let active = 0;
const MAX_ACTIVE = 2;
function runNext() {
  while (active < MAX_ACTIVE && waiting.length) {
    const request = waiting.shift();
    request.signal?.removeEventListener('abort', request.cancel);
    if (request.signal?.aborted) {
      request.reject(new DOMException('검색 취소', 'AbortError'));
      continue;
    }
    active += 1;
    Promise.resolve().then(request.run).then(request.resolve, request.reject).finally(() => {
      active -= 1;
      runNext();
    });
  }
}

// 공고 조회는 화면 전체에서 두 개씩만 실행하고, 취소된 대기 요청은 서버로 보내지 않습니다.
export function queueJobRequest(run, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('검색 취소', 'AbortError'));
      return;
    }
    const request = {
      run,
      signal,
      resolve,
      reject
    };
    request.cancel = () => {
      const index = waiting.indexOf(request);
      if (index !== -1) {
        waiting.splice(index, 1);
        reject(new DOMException('검색 취소', 'AbortError'));
      }
    };
    signal?.addEventListener('abort', request.cancel, {
      once: true
    });
    waiting.push(request);
    runNext();
  });
}
