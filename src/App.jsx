// 이 파일은 "주소표"입니다.
// 브라우저 주소가 /jobs인지 /login인지 보고 어떤 React 페이지를 보여줄지 정합니다.

import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import SearchPage from './pages/SearchPage';
import JobDetailPage from './pages/JobDetailPage';
import AuthPage from './pages/AuthPage';
import MyPage from './pages/MyPage';
import CompaniesPage from './pages/CompaniesPage';
import CoverPage from './pages/CoverPage';
import './styles/service.css';
import './styles/brand-theme.css';

export default function App() {
  // pathname은 현재 주소의 길 부분입니다. 예: /jobs/123 → /jobs/123
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [transition, setTransition] = useState('');
  const showCover = pathname === '/intro' || pathname === '/';

  function enterMain() {
    if (transition) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sessionStorage.setItem('startin-cover-seen', '1');
      navigate('/main', { replace: true });
    } else setTransition('closing');
  }

  // 흰 커튼이 덮인 상태에서 메인을 준비하고, 같은 커튼을 위로 걷는다.
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => {
      if (transition === 'closing') {
        sessionStorage.setItem('startin-cover-seen', '1');
        navigate('/main', { replace: true });
        setTransition('opening');
      } else setTransition('');
    }, transition === 'closing' ? 650 : 1350);
    return () => clearTimeout(timer);
  }, [transition, navigate]);

  // 완전히 다른 페이지로 이동했을 때만 맨 위에서 시작합니다.
  // 검색 조건/정렬처럼 같은 페이지 안에서 query string만 바뀔 때는 스크롤을 건드리지 않습니다.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
    {showCover ? <CoverPage onEnter={enterMain} /> : <div className={`site-shell${transition === 'opening' ? ' intro-main-reveal' : ''}`}>
      {/* 메인(/)에는 자체 상단 구성이 있어서 공통 Header를 숨깁니다. */}
      {pathname !== '/' && pathname !== '/main' && <Header />}

      {/* Routes는 "주소 → 화면" 연결표입니다. */}
      <Routes>
        <Route path="/" element={<SearchPage home />} />
        <Route path="/main" element={<SearchPage home />} />
        <Route path="/jobs" element={<SearchPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<CompaniesPage />} />
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route path="/register" element={<AuthPage key="register" register />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/coming-soon" element={<UnavailablePage />} />

        {/* 위 주소들과 하나도 맞지 않으면 404 안내를 보여줍니다. */}
        <Route
          path="*"
          element={(
            <main className="service-page">
              <h1>페이지를 찾을 수 없습니다.</h1>
              <Link to="/">메인으로 돌아가기</Link>
            </main>
          )}
        />
      </Routes>
    </div>}
    {transition && <div className={`intro-route-transition ${transition}`} aria-hidden="true"><b>나의 기회로<svg className="intro-transition-arrow" viewBox="0 0 32 32" fill="none"><path d="M16 27V5M7 14l9-9 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></b><small>YOUR NEXT STARTS HERE</small></div>}
    </>
  );
}

// 아직 만들지 않은 메뉴를 눌렀을 때 쓰는 공통 안내 화면입니다.
function UnavailablePage() {
  // 예: /coming-soon?feature=채용%20Q%26A 에서 feature 값을 읽습니다.
  const [params] = useSearchParams();
  const featureName = params.get('feature') || '서비스';

  return (
    <main className="service-page">
      <h1>{featureName} 준비중</h1>
      <p>아직 제공하지 않는 기능입니다. 현재는 조건 검색, 공고 상세, 저장과 개인 지원현황을 이용할 수 있습니다.</p>
      <Link className="primary-action" to="/jobs">채용공고 찾기</Link>
    </main>
  );
}
