import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import { api, resumeDownloadUrl } from '../services/api';

export default function ResumePanel() {
  const resume = useResource('/me/resume');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get('file');
    setMessage(''); setError('');
    if (!file?.size || file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setError('5MB 이하의 PDF 파일을 선택하세요.'); return;
    }
    setBusy(true);
    try { await api('/me/resume', { method: 'PUT', body }); form.reset(); setConfirmDelete(false); setMessage('이력서를 저장했습니다.'); resume.retry(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setMessage(''); setError('');
    try { await api('/me/resume', { method: 'DELETE' }); setConfirmDelete(false); setMessage('이력서를 삭제했습니다.'); resume.retry(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="resume-panel"><h2>내 이력서</h2>
    <p>PDF 한 개를 보관할 수 있습니다. 최대 5MB이며 본인만 확인할 수 있습니다.</p>
    {resume.loading ? <p role="status">이력서를 확인하는 중입니다…</p> : resume.error ? <p role="alert">{resume.error}<button onClick={resume.retry}>다시 시도</button></p> : <>
      {resume.data ? <div className="resume-current"><strong>{resume.data.filename}</strong> · {(resume.data.size / 1024).toFixed(1)}KB <a href={resumeDownloadUrl}>현재 PDF 다운로드</a><button disabled={busy} onClick={() => setConfirmDelete(true)}>이력서 삭제</button></div> : <p>등록된 이력서가 없습니다.</p>}
      <form onSubmit={upload}><label>PDF 이력서<input type="file" name="file" accept=".pdf,application/pdf" required disabled={busy} /></label><button className="primary-action" disabled={busy}>{busy ? '처리 중…' : resume.data ? '선택한 PDF로 교체' : '이력서 업로드'}</button></form>
      {confirmDelete && <div className="delete-confirm">보관 중인 이력서를 삭제할까요?<button disabled={busy} onClick={remove}>삭제 확인</button><button disabled={busy} onClick={() => setConfirmDelete(false)}>유지</button></div>}
    </>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
