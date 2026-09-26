import { useRef, useState } from 'react';
import '../styles/hero.css';

export default function Hero({ query, onSearch, count, companyCount, searching = false, guidance = '' }) {
  const [draft, setDraft] = useState(query);
  const [helpOpen, setHelpOpen] = useState(false);
  const inputRef = useRef(null);
  function chooseSuggestion(text) {
    setDraft(text);
    inputRef.current?.focus();
  }
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-introduction">
        <p className="hero-eyebrow">AI가 찾아주는 맞춤 채용 기회</p>
        <h1 id="hero-title">흩어진 공고에서,<br /><span>내게 맞는 기회만</span><br />찾아드립니다</h1>
        <p className="hero-description">AI가 지역, 직무, 경력, 학력, 근무조건, 기업 유형까지<br />분석해 당신에게 꼭 맞는 채용 기회를 빠르게 찾아드립니다.</p>
        <div className="hero-statistics">
          <div className="hero-stat">
            <svg viewBox="0 0 32 36" aria-hidden="true"><path fill="currentColor" d="M5 2h15l8 9v23H5z" /><path d="M20 2v10h8M10 18h13M10 23h13M10 28h8" fill="none" stroke="white" strokeWidth="2" /></svg>
            <div><strong>{count}건</strong><span>지금 찾는 채용공고</span></div>
          </div>
          <div className="hero-stat">
            <svg viewBox="0 0 32 36" aria-hidden="true"><path d="M2 33h28M6 33V9l13-6v30M19 13h8v20M10 11v4m0 4v4m0 4v4m5-23v4m0 4v4m0 4v4m8-10v4m0 4v4" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>
            <div><strong>{companyCount}개</strong><span>참여 기업</span></div>
          </div>
          <div className="hero-stat">
            <svg viewBox="0 0 42 36" aria-hidden="true"><g fill="currentColor"><circle cx="21" cy="8" r="6" /><circle cx="7" cy="12" r="4.7" /><circle cx="35" cy="12" r="4.7" /><path d="M11 35V25c0-12 20-12 20 0v10ZM0 32V23c0-7 9-10 12-4-5 4-5 9-5 13Zm42 0V23c0-7-9-10-12-4 5 4 5 9 5 13Z" /></g></svg>
            <div><strong>DEMO</strong><span>실제 채용이 아닙니다</span></div>
          </div>
        </div>
      </div>
      <div className="ai-search-panel">
        <div className="search-panel-heading">
          <div className="search-panel-title">
            <svg className="sparkle-icon" viewBox="0 0 38 40" aria-hidden="true"><path d="M14 12c0 10-4 14-12 15 8 1 12 5 12 13 1-8 5-12 13-13-8-1-12-5-13-15ZM29 0c0 7-3 10-9 11 6 1 9 4 9 10 1-6 4-9 9-10-5-1-8-4-9-11Z" fill="currentColor" /></svg>
            <h2>AI 채용 검색</h2>
          </div>
          <p>등록된 채용공고와 기업정보, 현직자 인사이트를 기반으로<br />당신에게 맞는 결과를 찾아드립니다.</p>
          <button type="button" className="search-help" onClick={() => setHelpOpen(value => !value)} aria-expanded={helpOpen}><span>?</span>어떤 걸 물어볼 수 있나요?</button>
        </div>
        <form className="ai-search-field" onSubmit={event => { event.preventDefault(); onSearch(draft.trim()); }}>
          <svg className="search-icon" viewBox="0 0 30 30" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m19 19 8 8" /></svg>
          <input ref={inputRef} className="search-placeholder" aria-label="공고 검색어" placeholder="기업명, 직무, 기술 키워드로 검색" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} />
          <button type="submit" className="ask-ai-button" disabled={searching}>{searching ? '조건 해석 중…' : '공고 검색'} <span aria-hidden="true">⟶</span></button>
        </form>
        <p className="search-guidance" title={guidance}><svg viewBox="0 0 20 22" aria-hidden="true"><path d="m10 1 9 4v7c0 4-6 8-9 9-3-1-9-5-9-9V5z" fill="currentColor" /><path d="m5 10 3 3 6-6" fill="none" stroke="white" strokeWidth="2" /></svg>{searching ? '검색조건을 해석하고 있습니다…' : guidance || '원하는 조건을 입력하세요. AI 연결이 없으면 키워드 검색으로 이어집니다.'}</p>
        {helpOpen && <div className="search-help-panel" role="status">추천검색어를 누르면 예시 문구만 입력됩니다. 검색을 누르면 AI 연결 시 입력 문구를 해석하고, 직접 선택한 필터와 함께 적용합니다. 키가 없거나 실패하면 키워드 검색합니다. 후기 분석은 제공하지 않습니다.<button type="button" onClick={() => setHelpOpen(false)}>닫기</button></div>}
        <div className="search-suggestions">
          <div className="suggestion-row">
            <button type="button" className="suggestion-highlight" onClick={() => chooseSuggestion('부산 신입 채용')}>부산 신입 채용 <span>›</span></button>
            <button type="button" onClick={() => chooseSuggestion('재택 가능한 일자리')}>재택 가능한 일자리 <span>›</span></button>
            <button type="button" onClick={() => chooseSuggestion('복지 좋은 중소기업')}>복지 좋은 중소기업 <span>›</span></button>
            <button type="button" onClick={() => chooseSuggestion('면접 후기 좋은 회사')}>면접 후기 좋은 회사</button>
          </div>
          <div className="suggestion-row">
            <button type="button" onClick={() => chooseSuggestion('경력무관 채용공고')}>경력무관 채용공고 <span>›</span></button>
            <button type="button" onClick={() => chooseSuggestion('연봉 5천 이상 공고')}>연봉 5천 이상 공고 <span>›</span></button>
            <button type="button" onClick={() => chooseSuggestion('워라밸 좋은 기업')}>워라밸 좋은 기업</button>
            <button type="button" onClick={() => chooseSuggestion('야근 적은 회사')}>야근 적은 회사</button>
          </div>
          <button type="button" className="more-suggestions" onClick={() => setHelpOpen(value => !value)} aria-label="추천 검색어 더 보기">›</button>
        </div>
      </div>
    </section>
  );
}
