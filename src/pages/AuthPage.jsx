// 학습용 설명: 로그인과 회원가입 입력을 서버에 보내는 페이지입니다.
// 큰 흐름: form 입력 → submit에서 FormData 읽기 → /auth/login 또는 /auth/register → AccountContext 저장.

import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAccount } from '../services/AccountContext';
import '../styles/auth.css';
function AuthIcon({
  type
}) {
  const paths = {
    mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
    lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',
    person: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',
    search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6',
    building: 'M3 21h18M5 21V5l9-3v19M14 10h5v11M8 7v2M11 6v2M8 12v2M11 11v2M8 17v2M11 16v2',
    robot: 'M5 7h14v12H5zM12 3v4M9 11v2M15 11v2M9 16h6M2 10v6M22 10v6',
    document: 'M5 2h10l4 4v16H5zM14 2v5h5M8 11h8M8 15h8M8 19h5',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0'
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type]} /></svg>;
}
function SocialMark({
  brand
}) {
  if (brand === 'google') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59C7.2 7.7 9.4 5.95 12 5.95Z" /></svg>;
  if (brand === 'kakao') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#FEE500" /><path fill="#191919" d="M12 4.5c-4.5 0-8.1 2.8-8.1 6.2 0 2.2 1.5 4.2 3.8 5.3l-.9 3.2c-.1.3.2.5.4.3l3.8-2.5 1 .1c4.5 0 8.1-2.8 8.1-6.4s-3.6-6.2-8.1-6.2Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#03C75A" /><path fill="#fff" d="M6 5.5h4.1l3.8 6V5.5H18v13h-4.1l-3.8-6v6H6Z" /></svg>;
}
function SocialButtons({
  compact = false
}) {
  return <div className={`auth-socials${compact ? ' is-compact' : ''}`} aria-label="소셜 계정 연결 준비중">
    {[['google', 'Google'], ['kakao', '카카오'], ['naver', '네이버']].map(([id, label]) => <button key={id} type="button" disabled title={`${label} 로그인 준비중`}><span className="auth-social-mark"><SocialMark brand={id} /></span><span>{label}로 {compact ? '가입' : '계속'}하기</span><small>준비중</small></button>)}
  </div>;
}

// 소개 문구도 이미지가 아닌 실제 글자로 그려 화면 크기에 맞게 읽히게 합니다.
const authBenefits = [['search', '조건에 맞는 공고', '지역·직무·급여를 고르고 지도와 목록을 함께 비교하세요.'], ['document', 'AI 이력서 · AI 자기소개서', '경험을 강점으로 정리하고 직무에 맞는 글을 준비하는 AI 작성 기능을 준비중입니다.'], ['robot', 'AI로 조건 검색', '원하는 근무 조건을 문장으로 입력해 검색을 시작하세요.']];
function AuthBenefits({
  register
}) {
  return <section className={register ? 'auth-benefits' : 'auth-intro-features'} aria-label="스타트인 서비스 장점">
    {register && <h2>가입 후 이용할 수 있는 서비스</h2>}
    {authBenefits.map(([icon, title, description]) => <article key={icon}>
      <span className={`auth-benefit-icon${icon === 'robot' ? ' is-ai' : ''}`}><AuthIcon type={icon} /></span>
      <div><h3>{title}</h3><p>{description}</p></div>
    </article>)}
    {register && <div className="auth-benefit-footer"><strong>관심 공고에서 다음 기회까지.</strong><p>조건을 비교하고, 마음에 드는 공고를 저장하고, 지원 준비를 이어가세요.</p></div>}
  </section>;
}
export default function AuthPage({
  register = false
}) {
  const {
    user,
    acceptSession
  } = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const scene = useRef(null);
  useEffect(() => {
    const header = document.querySelector('.site-header');
    if (!header || !scene.current) return undefined;
    const update = () => scene.current?.style.setProperty('--auth-header-height', `${header.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // 로그인 화면으로 오기 전에 보던 주소가 있으면 로그인 성공 뒤 그곳으로 돌아갑니다.
  const requested = location.state?.from;
  const safeRequestedPath = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') && !/^\/(login|register)/.test(requested);
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
    if (register && data.password !== data.confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      setBusy(false);
      return;
    }
    delete data.confirmPassword;
    const endpoint = register ? '/auth/register' : '/auth/login';
    try {
      const session = await api(endpoint, {
        method: 'POST',
        body: data
      });
      await acceptSession(session);
      navigate(from, {
        replace: true
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <main ref={scene} className={`auth-scene ${register ? 'auth-register' : 'auth-login'}`}>
      <div className="auth-photo" aria-hidden="true"><img src={register ? '/images/auth-register-clean.webp' : '/images/auth-login-photo.webp'} alt="" /></div>
      <div className="auth-layout">
        {register ? <header className="auth-register-heading"><h1>회원가입</h1><p>나에게 맞는 공고를 저장하고,<br />지원 준비를 한곳에서 이어가세요.</p></header> : <section className="auth-introduction"><p className="auth-eyebrow">YOUR NEXT STARTS HERE</p><h1>좋은 시작이<br /><em>좋은 내일</em>을 만듭니다.</h1><p>내 조건으로 찾고,<br />내 선택으로 준비하는 커리어.</p><AuthBenefits /></section>}
        <section className="auth-card" aria-labelledby="auth-card-title">
          <header><h2 id="auth-card-title">{register ? '기본 정보 입력' : '로그인'}</h2>{!register && <p>저장한 공고와 지원현황을 이어서 확인하세요.</p>}</header>
          <form onSubmit={submit} aria-busy={busy}>
            <div className={`auth-fields${register ? ' is-two-columns' : ''}`}>
              {register && <label>이름 <b>*</b><span className="auth-input"><AuthIcon type="person" /><input name="name" autoComplete="name" placeholder="이름을 입력해 주세요" maxLength={80} required disabled={busy} /></span></label>}
              <label>이메일 {register && <b>*</b>}<span className="auth-input"><AuthIcon type="mail" /><input name="email" type="email" autoComplete="email" placeholder="이메일을 입력해 주세요" maxLength={254} required disabled={busy} /></span></label>
              <label>비밀번호 {register && <b>*</b>}<span className="auth-input"><AuthIcon type="lock" /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? '10자 이상 입력해 주세요' : '비밀번호를 입력해 주세요'} minLength={register ? 10 : 1} maxLength={128} required disabled={busy} /><button className="auth-password-toggle" type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><AuthIcon type="eye" /></button></span></label>
              {register && <label>비밀번호 확인 <b>*</b><span className="auth-input"><AuthIcon type="lock" /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" minLength={10} maxLength={128} required disabled={busy} /></span></label>}
            </div>
            {!register && <div className="auth-form-tools"><span>이메일 계정으로 로그인</span><button type="button" disabled>비밀번호 찾기 <small>준비중</small></button></div>}
            {register && <div className="auth-demo-notice"><strong>학습용 데모 계정을 만듭니다.</strong></div>}
            <p className="auth-error" role={error ? 'alert' : undefined}>{error || '\u00a0'}</p>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? '처리 중…' : register ? '가입하기' : '로그인'}</button>
          </form>
          <div className="auth-divider"><span>{register ? '또는 간편하게 가입하기' : '또는 다른 계정으로 시작하기'}</span></div>
          <SocialButtons compact={register} />
          <div className="auth-switch"><span>{register ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}</span><Link to={register ? '/login' : '/register'} state={{
            from
          }}>{register ? '로그인하기' : '회원가입하기'} <span aria-hidden="true">›</span></Link></div>
        </section>
        {register && <AuthBenefits register />}
      </div>
    </main>;
}
