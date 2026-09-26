import '../styles/filter.css';
import { filterGroups } from '../data/filters';

export default function FilterPanel({ filters, onToggle, onReset, summary }) {
  function renderOptions(field) {
    const { options, neutral } = filterGroups[field];
    return options.map(option => {
      const selected = option === neutral ? !(filters[field]?.length) : !!filters[field]?.includes(option);
      return <button key={option} type="button" className={`filter-option${selected ? ' is-selected' : ''}`} aria-label={option} aria-pressed={selected} onClick={() => onToggle(field, option)}>{option}</button>;
    });
  }
  return (
    <section className="filter-panel" aria-labelledby="filter-title">
      <div className="filter-heading">
        <svg className="filter-location-icon" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1C5.8 1 1 5.7 1 11.5 1 19.3 12 29 12 29s11-9.7 11-17.5C23 5.7 18.2 1 12 1Z" fill="currentColor"/><circle cx="12" cy="11" r="4" fill="white"/><circle cx="12" cy="11" r="2" fill="currentColor"/></svg>
        <h2 id="filter-title">상세 조건으로 원하는 공고를 찾아보세요</h2>
        <p aria-live="polite" title="같은 항목 안에서는 하나라도, 서로 다른 항목은 모두 일치하는 공고를 표시합니다.">{summary || '조건을 선택하면 결과가 실시간으로 업데이트됩니다.'}</p>
        <button className="filter-reset" type="button" onClick={onReset}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 0 0-13.9-4L3 8m0-6v6h6M4 15a8 8 0 0 0 13.9 4L21 16m0 6v-6h-6"/></svg>
          조건 초기화
        </button>
      </div>

      <div className="filter-rows">
        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h20M4 21V5l9-3v19M13 9h7v12M7 7v2m3-3v2M7 12v2m3-3v2M7 17v2m3-3v2m6-7v2m0 3v2"/></svg><span>지역</span>
          </div>
          <div className="filter-options">
{renderOptions('region')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6V3h8v3M3 7h18v14H3zM3 11l9 4 9-4M10 12h4v5h-4z"/></svg><span>직무</span>
          </div>
          <div className="filter-options">
{renderOptions('category')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-7 10 7-10 7zM2 13l10 7 10-7M2 17l10 6 10-6"/></svg><span>학력</span>
          </div>
          <div className="filter-options">
{renderOptions('education')}
<span className="filter-group-label">지원조건</span>
{renderOptions('requirements')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="4"/><path d="M2 22c0-7 4-12 10-12s10 5 10 12Z"/></svg><span>경력</span>
          </div>
          <div className="filter-options">
{renderOptions('experience')}
<span className="filter-group-label">고용형태</span>
{renderOptions('employment')}
<span className="filter-group-label">근무형태</span>
{renderOptions('work_mode')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/></svg><span>급여</span>
          </div>
          <div className="filter-options">
{renderOptions('salary')}
<span className="filter-group-label">급여형태</span>
{renderOptions('salary_type')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4zM4 3l2 2m12 14 2 2M3 20l2-2M19 5l2-2"/></svg><span>근무조건</span>
          </div>
          <div className="filter-options">
{renderOptions('conditions')}
<span className="filter-group-label">기업형태</span>
{renderOptions('company_type')}
</div>
        </div>

        <div className="filter-row">
          <div className="filter-row-label">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v11H4zM2 7h20v4H2zM12 7v15M12 7C4 8 4 1 7 1s5 6 5 6Zm0 0c8 1 8-6 5-6s-5 6-5 6Z"/></svg><span>복리후생</span>
          </div>
          <div className="filter-options">
{renderOptions('benefits')}
<span className="filter-group-label">산업군</span>
{renderOptions('industry')}
</div>
        </div>
      </div>
    </section>
  );
}
