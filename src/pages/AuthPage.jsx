import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAccount } from '../services/AccountContext';
export default function AuthPage({ register = false }) {
  const { user, acceptSession } = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requested = location.state?.from;
  const from = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') && !/^\/(login|register)/.test(requested) ? requested : '/my';
  if (user) return <Navigate to={from} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await acceptSession(await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: data })); navigate(from, { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="service-page auth-page"><h1>{register ? '회원가입' : '로그인'}</h1><p>공고 저장과 지원현황을 계정별로 관리하세요.</p>
    <form onSubmit={submit}>
      {register && <label>이름<input name="name" autoComplete="name" maxLength={80} required /></label>}
      <label>이메일<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label>비밀번호<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 10 : 1} maxLength={128} required /></label>
      {register && <p>비밀번호는 10자 이상 입력하세요.</p>}{error && <p role="alert">{error}</p>}
      <button className="primary-action" disabled={busy}>{busy ? '처리 중…' : register ? '가입하기' : '로그인하기'}</button>
    </form>
    <Link to={register ? '/login' : '/register'} state={{ from }}>{register ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}</Link>
  </main>;
}
