import { useNavigate } from 'react-router-dom';
import { useAccount } from '../services/AccountContext';
import '../styles/header.css';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAccount();
  return (
    <header className="site-header">
      <div className="header-inner">
        <button type="button" className="brand" aria-label="STARTIN 홈" onClick={() => navigate('/')}>
          <svg className="brand-symbol" viewBox="0 0 44 46" aria-hidden="true">
            <path d="M4 4h26v35H4z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M4 4 22 10v34L4 37z" fill="currentColor" />
            <path d="m17 25 7 5 17-19M31 10h10v10" fill="none" stroke="#438d77" strokeWidth="4" />
            <circle cx="17" cy="25" r="1.7" fill="white" />
          </svg>
          <div className="brand-wordmark">
            <div className="brand-name">START<span>IN</span></div>
            <div className="brand-korean">스타트인</div>
          </div>
        </button>
        <nav className="header-nav" aria-label="메인 메뉴">
          <button type="button" className="header-nav-highlight" onClick={() => navigate('/coming-soon?feature=AI 취업코치')}>AI 취업코치</button>
          <button type="button" className="header-nav-highlight" onClick={() => navigate('/coming-soon?feature=AI 매칭')}>AI 매칭</button>
          <button type="button" onClick={() => navigate('/jobs')}>채용공고</button>
          <button type="button" onClick={() => navigate('/companies')}>기업정보</button>
          <button type="button" onClick={() => navigate('/coming-soon?feature=현직자 인사이트')}>현직자 인사이트</button>
          <button type="button" onClick={() => navigate('/coming-soon?feature=합격 후기')}>합격 후기</button>
          <button type="button" onClick={() => navigate('/coming-soon?feature=채용 Q&A')}>채용 Q&amp;A</button>
        </nav>
        <div className="header-actions">
          <button type="button" className="notification-button" aria-label="MY 저장공고" onClick={() => navigate('/my')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 4h4M12 2v2" /></svg>
          </button>
          <button type="button" className="login-button" onClick={() => navigate(user ? '/my' : '/login')}>{user ? 'MY' : '로그인'}</button>
          <button type="button" className="join-button" onClick={() => user ? logout() : navigate('/register')}>{user ? '로그아웃' : '회원가입'}</button>
        </div>
      </div>
    </header>
  );
}
