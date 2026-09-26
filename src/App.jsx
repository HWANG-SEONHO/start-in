import { useEffect } from 'react';
import { Routes, Route, Link, useLocation, useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import SearchPage from './pages/SearchPage';
import JobDetailPage from './pages/JobDetailPage';
import AuthPage from './pages/AuthPage';
import MyPage from './pages/MyPage';
import CompaniesPage from './pages/CompaniesPage';
import './styles/service.css';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <div className="site-shell">
    {pathname !== '/' && <Header />}
    <Routes>
      <Route path="/" element={<SearchPage home />} />
      <Route path="/jobs" element={<SearchPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/companies/:id" element={<CompaniesPage />} />
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/register" element={<AuthPage key="register" register />} />
      <Route path="/my" element={<MyPage />} />
      <Route path="/coming-soon" element={<UnavailablePage />} />
      <Route path="*" element={<main className="service-page"><h1>페이지를 찾을 수 없습니다.</h1><Link to="/">메인으로 돌아가기</Link></main>} />
    </Routes>
  </div>;
}

function UnavailablePage() {
  const [params] = useSearchParams();
  return <main className="service-page"><h1>{params.get('feature') || '서비스'} 준비중</h1><p>아직 제공하지 않는 기능입니다. 현재는 조건 검색, 공고 상세, 저장과 개인 지원현황을 이용할 수 있습니다.</p><Link className="primary-action" to="/jobs">채용공고 찾기</Link></main>;
}
