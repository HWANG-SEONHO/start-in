const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
export const resumeDownloadUrl = `${baseUrl}/me/resume/file`;
let csrfToken = null;
let onUnauthorized = null;

export function setCsrfToken(token) { csrfToken = token; }
export function setUnauthorizedHandler(handler) { onUnauthorized = handler; }

export async function api(path, { method = 'GET', body, signal } = {}) {
  const isFile = body instanceof FormData;
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method, signal, credentials: 'include',
      headers: { ...(body !== undefined && !isFile ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken && method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}) },
      ...(body !== undefined ? { body: isFile ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('서버에 연결할 수 없습니다. FastAPI 실행 상태를 확인한 후 다시 시도하세요.');
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail;
    const error = new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? (path.startsWith('/auth/') ? '이메일 형식과 비밀번호 길이 등 필수 조건을 확인해 주세요.' : '요청한 값의 형식이 올바르지 않습니다.') : '서버 요청에 실패했습니다. 다시 시도하세요.');
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export function getJobs({ filters = {}, query = '', sort = 'latest', districts = {}, ai = null, page = 1, pageSize = 10, signal } = {}) {
  const params = new URLSearchParams({ filters: JSON.stringify(filters), q: query, sort, districts: JSON.stringify(districts), page, page_size: pageSize, ...(ai ? { ai: JSON.stringify(ai) } : {}) });
  return api(`/jobs?${params}`, { signal });
}
