import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAccount } from '../services/AccountContext';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import JobCard from '../components/JobCard';
import ResumePanel from '../components/ResumePanel';

function ApplicationEditor({ application, onSaved }) {
  const [status, setStatus] = useState(application.status);
  const [note, setNote] = useState(application.note);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function save(remove = false) {
    setBusy(true); setMessage('');
    try {
      await api(`/me/applications/${application.job.id}`, { method: remove ? 'DELETE' : 'PUT', ...(remove ? {} : { body: { status, note } }) });
      setMessage('저장했습니다.'); onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <article className="application-item">
    <Link to={`/jobs/${application.job.id}`}><strong>{application.job.title}</strong></Link><p>{application.job.company} · {application.job.region}</p>
    <label>지원 상태<select value={status} onChange={event => setStatus(event.target.value)}>{['준비중', '지원완료', '서류통과', '면접', '최종합격', '불합격', '취소'].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>메모<textarea value={note} maxLength={2000} onChange={event => setNote(event.target.value)} /></label>
    <div className="action-row"><button disabled={busy} onClick={() => save()}>변경 저장</button><button disabled={busy} onClick={() => setConfirmDelete(true)}>기록 삭제</button></div>
    {confirmDelete && <div className="delete-confirm">이 지원 기록과 메모를 삭제할까요?<button disabled={busy} onClick={() => save(true)}>삭제 확인</button><button onClick={() => setConfirmDelete(false)}>유지</button></div>}
    {message && <p role="status">{message}</p>}
  </article>;
}
function AccountWorkspace() {
  const { user, savedJobs } = useAccount();
  const [params, setParams] = useSearchParams();
  const tab = ['saved', 'applications', 'resume'].includes(params.get('tab')) ? params.get('tab') : 'saved';
  const applications = useResource('/me/applications');
  return <main className="service-page"><h1>{user.name}님의 MY</h1>
    <div className="my-tabs" aria-label="MY 메뉴">{[['saved', `저장공고 ${savedJobs.length}`], ['applications', '지원현황'], ['resume', '이력서']].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => { setParams({ tab: value }); }}>{label}</button>)}</div>
    {tab === 'resume' && <ResumePanel />}
    {tab === 'saved' && <>{savedJobs.map(job => <JobCard key={job.id} job={job} />)}{!savedJobs.length && <p className="empty-results">저장한 공고가 없습니다. <Link to="/jobs">공고를 찾아 저장해 보세요.</Link></p>}</>}
    {tab === 'applications' && <><p className="demo-notice">개인 지원 기록을 관리하는 공간입니다. 기업에 지원서가 제출되지는 않습니다.</p>{applications.loading ? <p role="status">지원 기록을 불러오는 중입니다…</p> : applications.error ? <p role="alert">{applications.error}<button onClick={applications.retry}>다시 시도</button></p> : <>{applications.data.map(application => <ApplicationEditor key={`${application.id}-${application.status}-${application.note}`} application={application} onSaved={applications.retry} />)}{!applications.data.length && <p className="empty-results">지원 기록이 없습니다. <Link to="/jobs">공고 상세에서 추가하세요.</Link></p>}</>}</>}
  </main>;
}
export default function MyPage() {
  const { user, ready } = useAccount();
  if (!ready) return <main className="service-page" role="status">계정을 확인하는 중입니다…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: '/my' }} />;
  return <AccountWorkspace key={user.id} />;
}
