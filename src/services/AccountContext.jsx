// 학습용 설명: 로그인한 사용자 정보를 앱 전체가 함께 쓰도록 보관하는 공용 상태입니다.
// 큰 흐름: 로그인 확인 → 사용자/저장공고 기억 → 다른 화면이 useAccount()로 꺼내 씀.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, setCsrfToken, setUnauthorizedHandler } from './api';

// Context는 멀리 떨어진 component끼리 같은 값을 공유하는 React 기능입니다.
const AccountContext = createContext(null);

// 아래 성공 문구들은 잠깐 보여준 뒤 자동으로 닫습니다.
// 오류 문구는 이 목록에 넣지 않아 사용자가 직접 확인할 때까지 남겨둡니다.
const AUTO_HIDE_NOTICES = ['저장되었습니다.', '취소되었습니다.', '삭제되었습니다.', '업로드되었습니다.', '즐겨찾기 되었습니다.', '즐겨찾기 해제되었습니다.'];
export function AccountProvider({
  children
}) {
  // user: 로그인한 회원 정보. null이면 로그인하지 않은 상태입니다.
  const [user, setUser] = useState(null);
  const location = useLocation();
  // 로그아웃을 시작한 화면에서만 메인으로 이동하고, 이후 MY 접근은 로그인을 요구합니다.
  const [logoutLocationKey, setLogoutLocationKey] = useState(null);
  // ready: 처음 서버에 세션 확인을 끝냈는지 알려줍니다.
  const [ready, setReady] = useState(false);
  // savedJobs: 현재 사용자가 저장한 공고 목록입니다.
  const [savedJobs, setSavedJobs] = useState([]);
  // notice: 화면 아래에 보여줄 공통 알림입니다.
  // text는 문구, autoHide는 일정 시간이 지나면 자동으로 닫을지 뜻합니다.
  const [notice, setNoticeState] = useState({
    text: '',
    autoHide: false
  });

  // 다른 component는 예전처럼 setNotice('문구')만 호출하면 됩니다.
  // 같은 문구를 연속으로 띄워도 새 객체를 만들기 때문에 타이머가 다시 시작됩니다.
  function setNotice(message) {
    setNoticeState({
      text: message,
      autoHide: AUTO_HIDE_NOTICES.includes(message)
    });
  }
  // pendingIds: 저장 요청이 진행 중인 공고 id를 기억해 중복 클릭을 막습니다.
  const [pendingIds, setPendingIds] = useState(new Set());

  // 비동기 요청이 늦게 도착해 최신 로그인 상태를 덮어쓰지 못하게 버전 숫자를 씁니다.
  const sessionVersion = useRef(0);

  // 서버가 준 로그인 세션을 React 상태에 반영합니다.
  async function acceptSession(session) {
    const version = ++sessionVersion.current;

    // 이후 PUT/DELETE 같은 변경 요청에 붙일 CSRF 보안값을 API 모듈에 전달합니다.
    setCsrfToken(session.csrf_token || null);

    // 로그인했다면 저장공고도 같이 가져오고, 로그아웃 상태라면 빈 배열을 씁니다.
    const saved = session.user ? await api('/me/saved') : [];

    // 이 요청이 끝나는 동안 더 최신 로그인/로그아웃이 있었다면 오래된 결과를 버립니다.
    if (version !== sessionVersion.current) return;
    setUser(session.user);
    if (session.user) setLogoutLocationKey(null);
    setSavedJobs(saved);
    setNotice('');
    setReady(true);
  }

  // Provider가 처음 생길 때 서버에 "지금 로그인되어 있나요?"라고 한 번 묻습니다.
  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;

    // 다른 API에서 401(로그인 만료)이 나오면 공용 로그인 상태도 즉시 비웁니다.
    setUnauthorizedHandler(() => {
      sessionVersion.current += 1;
      setUser(null);
      setLogoutLocationKey(null);
      setSavedJobs([]);
      setCsrfToken(null);
      setNotice('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    });
    api('/auth/session').then(session => {
      if (active && version === sessionVersion.current) {
        return acceptSession(session);
      }
      return undefined;
    }).catch(error => {
      if (active) {
        setNotice(error.message);
        setReady(true);
      }
    });

    // Provider가 사라지면 늦게 온 응답을 무시하고 401 handler도 해제합니다.
    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  // 저장·취소·업로드·즐겨찾기 같은 성공 알림은 2.5초 뒤 자동으로 닫습니다.
  // X 버튼도 그대로 두어 사용자가 바로 닫고 싶을 때 사용할 수 있습니다.
  useEffect(() => {
    if (!notice.text || !notice.autoHide) return undefined;
    const timer = window.setTimeout(() => {
      setNoticeState({
        text: '',
        autoHide: false
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // 공고 하나를 저장하거나 저장 해제합니다.
  async function toggleSaved(job) {
    // 같은 공고 요청이 이미 진행 중이면 또 보내지 않습니다.
    if (pendingIds.has(job.id)) return;
    const version = sessionVersion.current;
    setPendingIds(previous => new Set([...previous, job.id]));
    try {
      const alreadySaved = savedJobs.some(item => item.id === job.id);

      // 이미 저장됐다면 DELETE, 아니면 PUT을 사용합니다.
      await api(`/me/saved/${job.id}`, {
        method: alreadySaved ? 'DELETE' : 'PUT'
      });
      if (version !== sessionVersion.current) return;

      // 서버 성공 후 화면의 저장목록도 같은 결과로 맞춥니다.
      setSavedJobs(previous => alreadySaved ? previous.filter(item => item.id !== job.id) : [...previous, job]);

      // 저장/해제 성공도 다른 성공 알림과 같은 하단 토스트를 사용합니다.
      setNotice(alreadySaved ? '즐겨찾기 해제되었습니다.' : '즐겨찾기 되었습니다.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      // 진행중 표시에서 이 공고 id를 빼 다시 누를 수 있게 합니다.
      setPendingIds(previous => {
        const next = new Set(previous);
        next.delete(job.id);
        return next;
      });
    }
  }

  // 서버 로그아웃 후 React 안의 로그인 상태도 비웁니다.
  async function logout() {
    sessionVersion.current += 1;
    try {
      await api('/auth/logout', {
        method: 'POST'
      });
      setLogoutLocationKey(location.key);
      await acceptSession({
        user: null
      });
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }
  return <AccountContext.Provider value={{
    user,
    loggedOut: logoutLocationKey === location.key,
    ready,
    savedJobs,
    pendingIds,
    toggleSaved,
    acceptSession,
    logout,
    setNotice
  }}>
      {children}

      {/* 저장·취소·업로드·즐겨찾기와 오류를 같은 하단 알림 상자로 보여줍니다. */}
      {notice.text && <div className="service-toast" role={notice.autoHide ? 'status' : 'alert'}>
          {notice.text}
          <button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">
            ×
          </button>
        </div>}
    </AccountContext.Provider>;
}

// 다른 component는 useAccount() 한 줄로 Context 값을 꺼낼 수 있습니다.
export const useAccount = () => useContext(AccountContext);
