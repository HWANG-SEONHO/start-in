// 학습용 설명: 로그인과 회원가입 입력을 서버에 보내는 페이지입니다.
// 큰 흐름: form 입력 → submit에서 FormData 읽기 → /auth/login 또는 /auth/register → AccountContext 저장.

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

  // 로그인 화면으로 오기 전에 보던 주소가 있으면 로그인 성공 뒤 그곳으로 돌아갑니다.
  const requested = location.state?.from;
  const safeRequestedPath = (
    typeof requested === 'string'
    && requested.startsWith('/')
    && !requested.startsWith('//')
    && !/^\/(login|register)/.test(requested)
  );
  const from = safeRequestedPath ? requested : '/my';

  // 이미 로그인했다면 로그인/회원가입 화면을 다시 보여줄 필요가 없습니다.
  if (user) return <Navigate to={from} replace />;

  // form 제출 시 브라우저 기본 새로고침을 막고 API로 값을 보냅니다.
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    // name이 붙은 input들을 { email: ..., password: ... } 객체로 바꿉니다.
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = register ? '/auth/register' : '/auth/login';

    try {
      const session = await api(endpoint, {
        method: 'POST',
        body: data,
      });

      await acceptSession(session);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="service-page auth-page">
      <h1>{register ? '회원가입' : '로그인'}</h1>
      <p>공고 저장과 지원현황을 계정별로 관리하세요.</p>

      <form onSubmit={submit}>
        {/* 회원가입에서만 이름 입력을 받습니다. */}
        {register && (
          <label>
            이름
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
        )}

        <label>
          이메일
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>

        <label>
          비밀번호
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={register ? 10 : 1}
            maxLength={128}
            required
          />
        </label>

        {register && <p>비밀번호는 10자 이상 입력하세요.</p>}
        {error && <p role="alert">{error}</p>}

        <button className="primary-action" disabled={busy}>
          {busy ? '처리 중…' : register ? '가입하기' : '로그인하기'}
        </button>
      </form>

      <Link to={register ? '/login' : '/register'} state={{ from }}>
        {register ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
      </Link>
    </main>
  );
}
