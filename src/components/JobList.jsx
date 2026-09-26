import { Link, useLocation } from 'react-router-dom';
import JobCard from './JobCard';
import Pagination from './Pagination';
import '../styles/jobs.css';

const sortOptions = [['latest', '최신순'], ['salary', '연봉 높은순'], ['views', '조회순'], ['applications', '지원 많은순'], ['saves', '관심 많은순'], ['size', '기업 규모순'], ['match', 'AI 매칭순']];

export default function JobList({ jobs, total = jobs.length, page = 1, totalPages = 1, onPage, region = '전체', sort = 'latest', onSort }) {
  const location = useLocation();
  return (
    <section className="job-list-section" aria-label={`${region} 채용공고`}>
      <div className="job-list-heading">
        <svg className="job-heading-icon" viewBox="0 0 30 34" aria-hidden="true">
          <path d="M3 1h16l8 8v23H3Z" fill="currentColor" />
          <path d="M19 1v9h8M8 15h13M8 21h13M8 27h8" fill="none" stroke="white" strokeWidth="1.6" />
        </svg>
        <div className="job-list-title-group">
          <h2>{region} 내 조건에 맞는 채용공고 <strong>{total.toLocaleString()}건</strong></h2>
          <p>선택한 조건과 일치하는 공고입니다. 데모 공고는 실제 채용이 아닙니다.</p>
        </div>
        <span className="recommendation-help"><span>!</span> 데모 데이터</span>
      </div>

      <div className="job-sort-options" aria-label="공고 정렬">
        {sortOptions.map(([value, label]) => <button key={value} type="button" disabled={!['latest', 'salary', 'size'].includes(value)} title={['latest', 'salary', 'size'].includes(value) ? label : '집계 및 AI 기능 준비중'} className={`job-sort-option${sort === value ? ' is-current' : ''}`} aria-pressed={sort === value} onClick={() => onSort(value)}>{label}</button>)}
      </div>

      <div className="job-cards">
        {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        {!jobs.length && <p className="empty-results" role="status">조건에 맞는 공고가 없습니다. 검색어나 조건을 변경해 보세요.</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={onPage} label={`${region} 공고 페이지`} />
      {location.pathname === '/' && <Link className="more-jobs" to={`/jobs${location.search}`}>공고 목록에서 보기 <span aria-hidden="true">↓</span></Link>}
    </section>
  );
}
