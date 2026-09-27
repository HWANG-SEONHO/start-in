// 학습용 설명: 기업 목록과 기업별 공고를 보여주는 페이지입니다.
// 큰 흐름: /companies면 기업 목록, /companies/:id면 기업 상세 + 그 기업 공고 목록.

import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import JobCard from '../components/JobCard';
import Pagination from '../components/Pagination';

export default function CompaniesPage() {
  // /companies/3 같은 주소면 id가 "3"으로 들어옵니다.
  const { id } = useParams();

  // id가 있으면 한 기업, 없으면 전체 기업 목록을 요청합니다.
  const companies = useResource(id ? `/companies/${id}` : '/companies');

  return (
    <main className="service-page">
      <h1>기업정보</h1>
      <p className="demo-notice">현재 기업 소개와 공고는 기능 확인용 데모 데이터입니다.</p>

      {companies.loading ? (
        <p role="status">기업 정보를 불러오는 중입니다…</p>
      ) : companies.error ? (
        <p role="alert">
          {companies.error}
          <button onClick={companies.retry}>다시 시도</button>
        </p>
      ) : id ? (
        // 기업 하나를 보는 주소라면 상세정보와 해당 기업 공고를 보여줍니다.
        <>
          <Link to="/companies">← 기업 목록</Link>
          <h2>{companies.data.name}</h2>
          <p>{companies.data.description}</p>
          <CompanyJobs id={Number(id)} />
        </>
      ) : (
        // 전체 목록에서는 기업마다 상세 페이지로 가는 Link를 만듭니다.
        <div className="company-directory">
          {companies.data.map(company => (
            <Link to={`/companies/${company.id}`} key={company.id}>
              <h2>{company.name}</h2>
              <p>{company.description}</p>
              <span>기업 소개 및 채용공고 →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

// 선택한 기업 id의 공고만 페이지 단위로 가져옵니다.
function CompanyJobs({ id }) {
  const [params, setParams] = useSearchParams();

  // URL의 page가 올바른 양의 정수가 아니면 1페이지를 씁니다.
  const pageNumber = Number(params.get('page'));
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const jobs = useResource(`/jobs?company_id=${id}&page=${page}&page_size=10`);

  return (
    <section>
      <h2>이 기업의 채용공고{jobs.data ? ` ${jobs.data.total}건` : ''}</h2>

      {jobs.loading ? (
        <p role="status">공고를 불러오는 중입니다…</p>
      ) : jobs.error ? (
        <p role="alert">
          {jobs.error}
          <button onClick={jobs.retry}>다시 시도</button>
        </p>
      ) : (
        <>
          {jobs.data.items.map(job => <JobCard key={job.id} job={job} />)}
          {!jobs.data.total && <p>등록된 공고가 없습니다.</p>}

          <Pagination
            page={jobs.data.page}
            totalPages={jobs.data.total_pages}
            onPage={value => setParams(
              { page: value },
              { preventScrollReset: true },
            )}
          />
        </>
      )}
    </section>
  );
}
