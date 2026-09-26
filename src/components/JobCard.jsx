import { Link } from 'react-router-dom';
import SaveButton from './SaveButton';
import { salaryLabel, deadlineLabel } from '../services/format';
function CompanyLogo({ company }) {
  if (company === 'LG전자') {
    return (
      <span className="company-logo company-logo-lg" aria-hidden="true">
        <svg className="lg-emblem" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="#c90043" />
          <circle cx="16" cy="16" r="11.7" fill="none" stroke="white" strokeWidth="1.2" />
          <path d="M15 9v14h5M20 16h6" fill="none" stroke="white" strokeWidth="1.4" />
          <circle cx="11" cy="11" r="1.5" fill="white" />
        </svg>
        <span>LG전자</span>
      </span>
    );
  }

  if (company === '현대자동차') {
    return (
      <span className="company-logo company-logo-hyundai" aria-hidden="true">
        <svg viewBox="0 0 90 44">
          <ellipse cx="45" cy="22" rx="35" ry="15" transform="rotate(-10 45 22)" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M30 12 19 33h12l6-10h11l-5 10h12L69 10H57l-6 10H40l5-10Z" fill="currentColor" />
        </svg>
      </span>
    );
  }

  const logoClass = company === '네이버' ? 'naver' : company === '카카오' ? 'kakao' : 'line';
  const logoText = company === '네이버' ? 'NAVER' : company === '카카오' ? 'kakao' : 'LINE+';

  return <span className={`company-logo company-logo-${logoClass}`} aria-hidden="true">{logoText}</span>;
}

export default function JobCard({ job }) {
  return (
    <article className="job-card">
      <CompanyLogo company={job.company} />
      <Link className="job-company-name" to={`/companies/${job.company_id}`}>{job.company}</Link>
      <div className="job-description">
        <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
        <div className="job-tags">
          {job.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="job-compensation">
        <p>{salaryLabel(job)}</p>
        <span>{deadlineLabel(job.deadline)}</span>
      </div>
      <SaveButton job={job} />
    </article>
  );
}
