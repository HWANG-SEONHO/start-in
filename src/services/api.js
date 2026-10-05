// 이 파일은 React 화면과 FastAPI 서버 사이의 "전화기" 역할을 합니다.
// 화면은 api('/jobs')처럼 요청하고, 이 파일이 실제 fetch 요청과 오류 처리를 맡습니다.

// 개발 중에는 /api를 쓰고, 배포 환경에서 주소를 따로 주면 그 주소를 씁니다.
import { queueJobRequest } from './jobRequestQueue';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const connectionErrorMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';

// 이력서 PDF는 브라우저가 직접 내려받을 수 있도록 완성된 주소를 따로 내보냅니다.
export const resumeDownloadUrl = `${baseUrl}/me/resume/file`;

// CSRF 토큰은 로그인 사용자가 "진짜 우리 화면에서 보낸 변경 요청"인지 확인하는 보안값입니다.
let csrfToken = null;
let onUnauthorized = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// 모든 API 요청이 지나가는 공통 함수입니다.
export async function api(path, { method = 'GET', body, signal } = {}) {
  // FormData는 파일 업로드용이라 JSON으로 바꾸면 안 됩니다.
  const isFileUpload = body instanceof FormData;
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      credentials: 'include', // 로그인 쿠키도 함께 보냅니다.
      headers: {
        // 일반 객체를 보낼 때만 JSON이라고 알려줍니다.
        ...(body !== undefined && !isFileUpload ? { 'Content-Type': 'application/json' } : {}),
        // 데이터를 바꾸는 요청에는 CSRF 토큰도 붙입니다.
        ...(csrfToken && method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      // 일반 객체는 JSON 문자열로, 파일은 FormData 그대로 보냅니다.
      ...(body !== undefined ? { body: isFileUpload ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    // 사용자가 다른 검색을 시작해서 이전 요청을 취소한 경우는 정상 흐름이므로 그대로 전달합니다.
    if (error.name === 'AbortError') throw error;
    throw new Error(connectionErrorMessage);
  }

  // HTTP 200번대가 아니면 화면에서 처리할 수 있는 Error로 바꿉니다.
  if (!response.ok) {
    // 로그인 만료(401)가 나오면 AccountContext가 사용자 상태를 비우도록 알립니다.
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();

    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail;
    // 서버가 보낸 설명의 모양이 다르므로 순서대로 확인합니다.
    // 문장이면 그대로 쓰고, 입력 오류 목록이면 안내 문구로 바꿔 읽기 쉽게 전달합니다.
    let message = '서버 요청에 실패했습니다. 다시 시도하세요.';
    if (response.status >= 500) {
      message = connectionErrorMessage;
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = path.startsWith('/auth/')
        ? '이메일 형식과 비밀번호 길이 등 필수 조건을 확인해 주세요.'
        : '요청한 값의 형식이 올바르지 않습니다.';
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // 204는 "성공했지만 돌려줄 내용은 없음"이라는 뜻입니다.
  return response.status === 204 ? null : response.json();
}

// 지도에서 고른 구·군 값을 서버가 이해할 수 있는 안전한 모양으로 정리합니다.
function normalizeDistricts(districts) {
  if (!districts || typeof districts !== 'object' || Array.isArray(districts)) return {};

  const selectedRegions = [];
  for (const [region, value] of Object.entries(districts)) {
    if (typeof region !== 'string' || region.length > 20) continue;

    // 예전 주소는 구 이름 하나, 새 주소는 여러 개를 보냅니다.
    // 먼저 배열로 맞춰 놓으면 아래에서 같은 순서로 검사할 수 있습니다.
    let districtNames = [];
    if (Array.isArray(value)) districtNames = value;
    else if (typeof value === 'string') districtNames = [value];

    // 잘못된 이름을 빼고 앞의 30개만 받은 뒤 중복을 지웁니다.
    // 기존 제한 순서를 유지하므로 서버에 보내는 검색조건도 달라지지 않습니다.
    const validNames = districtNames
      .filter(name => typeof name === 'string' && name && name.length <= 40)
      .slice(0, 30);
    if (validNames.length) selectedRegions.push([region, [...new Set(validNames)]]);
  }

  return Object.fromEntries(selectedRegions.slice(0, 17));
}

// 공고 목록을 가져올 때 필요한 조건들을 URL query string으로 바꿉니다.
export function getJobs({
  filters = {},
  query = '',
  sort = 'latest',
  districts = {},
  ai = null,
  page = 1,
  pageSize = 10,
  signal,
} = {}) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    q: query,
    sort,
    districts: JSON.stringify(normalizeDistricts(districts)),
    page,
    page_size: pageSize,
    ...(ai ? { ai: JSON.stringify(ai) } : {}),
  });

  return queueJobRequest(() => api(`/jobs?${params}`, { signal }), signal);
}
