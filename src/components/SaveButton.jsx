import { useLocation, useNavigate } from 'react-router-dom';
import { useAccount } from '../services/AccountContext';

export default function SaveButton({ job }) {
  const { user, ready, savedJobs, pendingIds, toggleSaved } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = savedJobs.some(item => item.id === job.id);
  function save() {
    if (!user) navigate('/login', { state: { from: location.pathname + location.search } });
    else toggleSaved(job);
  }
  return <button type="button" className={`job-bookmark${saved ? ' is-saved' : ''}`} disabled={!ready || pendingIds.has(job.id)} aria-pressed={saved} aria-label={`${job.title} ${saved ? '저장 취소' : '저장'}`} onClick={save}>
    <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} aria-hidden="true"><path d="M6 3.5h12v17l-6-4.5-6 4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
  </button>;
}
