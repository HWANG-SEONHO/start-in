import { useEffect, useState } from 'react';
import { api } from '../services/api';
export function useResource(path) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, error: '', path: '', attempt: -1 });
  useEffect(() => {
    const controller = new AbortController();
    api(path, { signal: controller.signal })
      .then(data => setState({ data, error: '', path, attempt }))
      .catch(error => { if (error.name !== 'AbortError') setState({ data: null, error: error.message, path, attempt }); });
    return () => controller.abort();
  }, [path, attempt]);
  const loading = state.path !== path || state.attempt !== attempt;
  return { data: loading ? null : state.data, error: loading ? '' : state.error, loading, retry: () => setAttempt(value => value + 1) };
}
