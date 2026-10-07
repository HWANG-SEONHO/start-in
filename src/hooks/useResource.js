// 학습용 설명: 서버에서 자료 하나를 불러오고 로딩/오류/재시도를 관리하는 공용 hook입니다.
// 예: useResource('/companies')를 쓰면 data/loading/error/retry를 한 번에 받을 수 있습니다.

import { useEffect, useState } from 'react';
import { api } from '../services/api';
export function useResource(path) {
  // retry를 누르면 attempt 숫자가 바뀌어 같은 주소도 다시 요청됩니다.
  const [attempt, setAttempt] = useState(0);

  // 어떤 path와 attempt의 결과인지 같이 저장해야 오래된 응답과 새 요청을 구분할 수 있습니다.
  const [state, setState] = useState({
    data: null,
    error: '',
    path: '',
    attempt: -1
  });
  useEffect(() => {
    const controller = new AbortController();
    api(path, {
      signal: controller.signal
    }).then(data => {
      setState({
        data,
        error: '',
        path,
        attempt
      });
    }).catch(error => {
      // 다른 화면으로 이동해서 요청이 취소된 경우는 진짜 오류가 아닙니다.
      if (error.name !== 'AbortError') {
        setState({
          data: null,
          error: error.message,
          path,
          attempt
        });
      }
    });

    // path가 바뀌거나 component가 사라지면 아직 끝나지 않은 요청을 취소합니다.
    return () => controller.abort();
  }, [path, attempt]);

  // state가 아직 현재 path/attempt의 결과가 아니면 로딩 중입니다.
  const loading = state.path !== path || state.attempt !== attempt;
  return {
    data: loading ? null : state.data,
    error: loading ? '' : state.error,
    loading,
    retry: () => setAttempt(value => value + 1)
  };
}
