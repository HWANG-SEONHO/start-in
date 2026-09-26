import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import JobCard from '../components/JobCard';
import Pagination from '../components/Pagination';

export default function CompaniesPage() {
  const { id } = useParams();
  const companies = useResource(id ? `/companies/${id}` : '/companies');
  return <main className="service-page"><h1>기업정보</h1><p className="demo-notice">현재 기업 소개와 공고는 기능 확인용 데모 데이터입니다.</p>
    {companies.loading ? <p role="status">기업 정보를 불러오는 중입니다…</p> : companies.error ? <p role="alert">{companies.error}<button onClick={companies.retry}>다시 시도</button></p> : id ? <><Link to="/companies">← 기업 목록</Link><h2>{companies.data.name}</h2><p>{companies.data.description}</p><CompanyJobs id={Number(id)} /></> : <div className="company-directory">{companies.data.map(company => <Link to={`/companies/${company.id}`} key={company.id}><h2>{company.name}</h2><p>{company.description}</p><span>기업 소개 및 채용공고 →</span></Link>)}</div>}
  </main>;
}
function CompanyJobs({ id }) {
  const [params, setParams] = useSearchParams();
  const number = Number(params.get('page'));
  const page = Number.isSafeInteger(number) && number > 0 ? number : 1;
  const jobs = useResource(`/jobs?company_id=${id}&page=${page}&page_size=10`);
  return <section><h2>이 기업의 채용공고{jobs.data ? ` ${jobs.data.total}건` : ''}</h2>{jobs.loading ? <p role="status">공고를 불러오는 중입니다…</p> : jobs.error ? <p role="alert">{jobs.error}<button onClick={jobs.retry}>다시 시도</button></p> : <>{jobs.data.items.map(job => <JobCard key={job.id} job={job} />)}{!jobs.data.total && <p>등록된 공고가 없습니다.</p>}<Pagination page={jobs.data.page} totalPages={jobs.data.total_pages} onPage={value => setParams({ page: value })} /></>}</section>;
}
