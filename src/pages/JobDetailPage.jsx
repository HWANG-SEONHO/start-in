import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import { useAccount } from '../services/AccountContext';
import { api } from '../services/api';
import { salaryLabel } from '../services/format';
import SaveButton from '../components/SaveButton';
export default function JobDetailPage() {
  const { id } = useParams();
  const { data: job, loading, error, retry } = useResource(`/jobs/${id}`);
  const { user } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function addApplication() {
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return; }
    setBusy(true);
    try {
      const existing = await api('/me/applications');
      if (!existing.some(item => item.job.id === job.id)) await api(`/me/applications/${job.id}`, { method: 'PUT', body: { status: '준비중', note: '' } });
      navigate('/my?tab=applications');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  return <main className="service-page"><Link to="/jobs">← 공고 목록</Link>
    {loading ? <p role="status">공고를 불러오는 중입니다…</p> : error ? <div role="alert">{error} <button onClick={retry}>다시 시도</button></div> : <>
      {job.is_demo && <p className="demo-notice">데모 공고입니다. 실제 채용·지원 접수가 이루어지지 않습니다.</p>}
      <div className="detail-heading"><div><Link to={`/companies/${job.company_id}`}>{job.company}</Link><h1>{job.title}</h1></div><SaveButton job={job} /></div>
      <dl className="job-facts">{[['지역', `${job.region} ${job.district}`], ['직무', job.category], ['급여', salaryLabel(job)], ['경력', job.experience], ['학력', job.education], ['고용형태', job.employment], ['근무형태', job.work_mode], ['마감일', job.deadline]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="detail-description">{job.description}</p><h2>근무조건 및 복리후생</h2><p>{[...job.conditions, ...job.benefits].join(' · ')}</p>
      <button className="primary-action" onClick={addApplication} disabled={busy}>{busy ? '저장 중…' : 'MY 지원현황에 추가'}</button>
      {message && <p role="alert">{message}</p>}
    </>}
  </main>;
}
