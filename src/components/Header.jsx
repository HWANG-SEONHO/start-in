// 학습용 설명: 로고, 메뉴, 로그인/로그아웃 버튼이 있는 상단바입니다.
// 큰 흐름: 메뉴 클릭 → navigate()로 주소 변경, 로그아웃 클릭 → 확인 dialog → API 로그아웃.

import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { homeSearchUrl, jobsSearchUrl } from '../services/homeSearch';
import { useAccount } from '../services/AccountContext';
import '../styles/header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAccount();

  // dialog DOM과 "로그아웃 요청이 이미 진행 중인지"를 ref로 기억합니다.
  const logoutDialog = useRef(null);
  const logoutPending = useRef(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // 로그아웃 버튼을 눌렀을 때 바로 나가지 않고 확인창을 먼저 엽니다.
  function askLogout() {
    setLogoutError('');
    logoutDialog.current?.showModal();
  }

  // 확인창에서 "로그아웃"을 눌렀을 때 실제 서버 요청을 실행합니다.
  async function confirmLogout() {
    // 빠르게 여러 번 눌러도 요청은 한 번만 보냅니다.
    if (logoutPending.current) return;

    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError('');

    try {
      if (await logout()) {
        logoutDialog.current?.close();
        navigate('/');
      } else {
        setLogoutError('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          {/* 홈에서는 조건을 유지하고, 다른 페이지에서는 마지막 홈 검색으로 돌아갑니다. */}
          <button
            type="button"
            className="brand"
            aria-label="STARTIN 홈"
            onClick={() => {
              if (location.pathname !== '/main') navigate(homeSearchUrl());
            }}
          >
            <span className="brand-wordmark">START <span>IN</span></span>
          </button>

          {/* 준비중 기능은 /coming-soon으로 보내고 feature 이름을 query string으로 전달합니다. */}
          <nav className="header-nav" aria-label="메인 메뉴">
            <button type="button" className="header-nav-highlight" onClick={() => navigate('/coming-soon?feature=AI 취업코치')}>AI 취업코치</button>
            <button type="button" className="header-nav-highlight" onClick={() => navigate('/coming-soon?feature=AI 매칭')}>AI 매칭</button>
            <button type="button" onClick={() => {
              if (location.pathname === '/jobs') return;
              navigate(jobsSearchUrl(location.pathname === '/main' ? location.search : undefined));
            }}>채용공고</button>
            <button type="button" onClick={() => navigate('/companies')}>기업정보</button>
            <button type="button" onClick={() => navigate('/coming-soon?feature=현직자 인사이트')}>현직자 인사이트</button>
            <button type="button" onClick={() => navigate('/coming-soon?feature=합격 후기')}>합격 후기</button>
            <button
              type="button"
              // & 문자는 URL에서 특별한 뜻이 있으므로 encodeURIComponent로 안전하게 감쌉니다.
              onClick={() => navigate(`/coming-soon?feature=${encodeURIComponent('채용 Q&A')}`)}
            >
              채용 <span className="nav-qa">Q&amp;A</span>
            </button>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="notification-button"
              aria-label="MY 저장공고"
              onClick={() => navigate('/my')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 4h4M12 2v2" />
              </svg>
            </button>

            <button
              type="button"
              className="login-button"
              onClick={() => navigate(user ? '/my' : '/login')}
            >
              {user ? 'MY' : '로그인'}
            </button>

            <button
              type="button"
              className="join-button"
              onClick={() => (user ? askLogout() : navigate('/register'))}
            >
              {user ? '로그아웃' : '회원가입'}
            </button>
          </div>
        </div>
      </header>

      {/* HTML dialog를 사용한 공통 로그아웃 확인창입니다. */}
      <dialog
        ref={logoutDialog}
        className="logout-dialog"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
        aria-busy={loggingOut}
        onCancel={event => {
          if (logoutPending.current) event.preventDefault();
        }}
        onClick={event => {
          // 팝업 내용 바깥의 어두운 영역을 누르면 닫습니다. 요청 중에는 닫지 않습니다.
          if (event.target === event.currentTarget && !logoutPending.current) {
            logoutDialog.current.close();
          }
        }}
      >
        <div className="logout-dialog-content">
          <div className="logout-dialog-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4H5v16h5M14 8l4 4-4 4M9 12h10" />
            </svg>
          </div>

          <h2 id="logout-title">로그아웃하시겠습니까?</h2>
          <p id="logout-description">
            저장한 공고와 이력서는 그대로 보관됩니다.<br />
            다시 로그인하면 이어서 확인할 수 있어요.
          </p>

          {logoutError && <p className="logout-dialog-error" role="alert">{logoutError}</p>}

          <div className="logout-dialog-actions">
            <button
              type="button"
              className="logout-cancel"
              autoFocus
              disabled={loggingOut}
              onClick={() => logoutDialog.current.close()}
            >
              취소
            </button>
            <button
              type="button"
              className="logout-confirm"
              disabled={loggingOut}
              onClick={confirmLogout}
            >
              {loggingOut ? '로그아웃 중…' : '로그아웃'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
