// 학습용 설명: JobCard는 "채용공고 한 건"을 카드 한 장으로 보여주는 부품입니다.
// 읽는 순서: 회사 로고 → 회사명 → 공고 제목/태그 → 급여/마감일 → 저장 버튼

import { Link } from 'react-router-dom';

import SaveButton from './SaveButton';
import { deadlineLabel, salaryLabel } from '../services/format';


// 실제 기업 로고 파일이 없는 데모 화면이라 회사 이름에 맞춰 작은 로고 모양을 만듭니다.
function CompanyLogo({ company }) {
  // LG전자는 간단한 SVG 모양을 직접 그립니다.
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

  // 현대자동차도 같은 방식으로 간단한 SVG 모양을 만듭니다.
  if (company === '현대자동차') {
    return (
      <span className="company-logo company-logo-hyundai" aria-hidden="true">
        <svg viewBox="0 0 90 44">
          <ellipse
            cx="45"
            cy="22"
            rx="35"
            ry="15"
            transform="rotate(-10 45 22)"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M30 12 19 33h12l6-10h11l-5 10h12L69 10H57l-6 10H40l5-10Z"
            fill="currentColor"
          />
        </svg>
      </span>
    );
  }

  // 회사 이름을 두 번 비교하지 않도록 모양과 글자를 한 표에서 함께 찾습니다.
  // 표에 없는 회사는 공통 표시로 돌아가 다른 회사 로고가 나오지 않게 합니다.
  const demoLogos = {
    '네이버': { className: 'naver', text: 'NAVER' },
    '카카오': { className: 'kakao', text: 'kakao' },
    'LINE PLUS': { className: 'line', text: 'LINE+' },
  };
  const logo = Object.hasOwn(demoLogos, company) ? demoLogos[company] : null;
  if (!logo) {
    return (
      <span className="company-logo company-logo-generic" aria-hidden="true">
        기업
      </span>
    );
  }

  return (
    <span className={`company-logo company-logo-${logo.className}`} aria-hidden="true">
      {logo.text}
    </span>
  );
}


export default function JobCard({ job }) {
  return (
    <article className="job-card">
      {/* 1) 회사 표시 */}
      <CompanyLogo company={job.company} />
      <Link
        className="job-company-name"
        title={job.company}
        to={`/companies/${job.company_id}`}
      >
        {job.company}
      </Link>

      {/* 2) 공고 제목과 태그 */}
      <div className="job-description">
        <h3 title={job.title}>
          <Link to={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>
        <div className="job-tags">
          {job.tags.map((tag) => (
            <span key={tag} title={tag}>{tag}</span>
          ))}
        </div>
      </div>

      {/* 3) 급여와 마감일 */}
      <div className="job-compensation">
        <p>{salaryLabel(job)}</p>
        <span>{deadlineLabel(job.deadline)}</span>
      </div>

      {/* 4) 사용자가 나중에 다시 볼 수 있게 저장하는 버튼 */}
      <SaveButton job={job} />
    </article>
  );
}
