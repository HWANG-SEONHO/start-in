// 학습용 설명: 여러 채용공고 카드를 한 줄 목록으로 묶어 보여주는 부품입니다.
// 큰 흐름: 제목/정렬 버튼 → JobCard 반복 → 페이지 버튼 → 더보기 링크.

import { Link, useLocation } from 'react-router-dom';
import JobCard from './JobCard';
import Pagination from './Pagination';
import '../styles/jobs.css';

// 실제 동작하는 정렬은 latest/salary/size이고, 나머지는 준비중 버튼으로만 보여줍니다.
const sortOptions = [
  ['latest', '최신순'],
  ['salary', '연봉 높은순'],
  ['views', '조회순'],
  ['applications', '지원 많은순'],
  ['saves', '관심 많은순'],
  ['size', '기업 규모순'],
  ['match', 'AI 매칭순'],
];

const activeSorts = ['latest', 'salary', 'size'];

export default function JobList({
  jobs,
  total = jobs.length,
  page = 1,
  totalPages = 1,
  onPage,
  region = '전체',
  sort = 'latest',
  onSort,
  moreLink,
}) {
  const location = useLocation();

  return (
    <section className="job-list-section" aria-label={`${region} 채용공고`}>
      {/* 목록 제목과 현재 공고 수 */}
      <div className="job-list-heading">
        <svg className="job-heading-icon" viewBox="0 0 30 34" aria-hidden="true">
          <path d="M3 1h16l8 8v23H3Z" fill="currentColor" />
          <path
            d="M19 1v9h8M8 15h13M8 21h13M8 27h8"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
          />
        </svg>

        <div className="job-list-title-group">
          <h2>
            {region} 내 조건에 맞는 채용공고 <strong>{total.toLocaleString()}건</strong>
          </h2>
          <p>선택한 조건과 일치하는 공고입니다. 데모 공고는 실제 채용이 아닙니다.</p>
        </div>

        <span className="recommendation-help">
          <span>!</span> 데모 데이터
        </span>
      </div>

      {/* 정렬 버튼: 지원하지 않는 기능은 disabled로 잠가 둡니다. */}
      <div className="job-sort-options" aria-label="공고 정렬">
        {sortOptions.map(([value, label]) => {
          const enabled = activeSorts.includes(value);

          return (
            <button
              key={value}
              type="button"
              disabled={!enabled}
              title={enabled ? label : '집계 및 AI 기능 준비중'}
              className={`job-sort-option${sort === value ? ' is-current' : ''}`}
              aria-pressed={sort === value}
              onClick={() => onSort(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* jobs 배열의 공고 하나마다 JobCard 하나를 만듭니다. */}
      <div className="job-cards">
        {jobs.map(job => <JobCard key={job.id} job={job} />)}

        {!jobs.length && (
          <div className="job-empty-state" role="status">
            <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="14" r="9" /><path d="m21 21 7 7M10 14h8" /></svg>
            <strong>조건에 맞는 공고가 없습니다</strong>
            <p>검색어를 짧게 바꾸거나 선택한 조건을 줄여보세요.</p>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={onPage}
        label={`${region} 공고 페이지`}
      />

      {/* 메인 화면에서만 지역별 전체 목록으로 내려가는 링크를 보여줍니다. */}
      {location.pathname === '/' && (
        <Link className="more-jobs" to={moreLink || `/jobs${location.search}`}>
          {region} 공고 목록 보기 <span aria-hidden="true">↓</span>
        </Link>
      )}
    </section>
  );
}
