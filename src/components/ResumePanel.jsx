import RequestError from './RequestError';
// 학습용 설명: PDF 이력서를 올리고, 내려받고, 바꾸고, 지우는 화면 부품입니다.
// 큰 흐름: 서버의 현재 이력서 확인 → 파일 선택 → 업로드/교체/삭제 → 다시 조회.

import { useRef, useState } from 'react';
import { useResource } from '../hooks/useResource';
import { api, resumeDownloadUrl } from '../services/api';
import { useAccount } from '../services/AccountContext';

export default function ResumePanel() {
  // 업로드 성공처럼 앱 전체에서 공통으로 보여줄 안내 팝업을 사용합니다.
  const { setNotice } = useAccount();
  // 서버가 기억하고 있는 현재 이력서 정보를 읽습니다.
  const resume = useResource('/me/resume');

  // 숨겨둔 <input type="file">을 버튼으로 열기 위해 DOM 주소를 기억합니다.
  const fileInput = useRef(null);

  // 화면에 필요한 작은 상태들입니다.
  const [selectedName, setSelectedName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 선택한 PDF를 서버에 업로드합니다.
  async function upload(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get('file');

    setMessage('');
    setError('');

    // 브라우저에서도 먼저 기본 검사를 해 불필요한 서버 요청을 줄입니다.
    const maxSize = 5 * 1024 * 1024;
    const invalidFile = (
      !file?.size
      || file.size > maxSize
      || !file.name.toLowerCase().endsWith('.pdf')
      || file.type !== 'application/pdf'
    );

    if (invalidFile) {
      setError('5MB 이하의 PDF 파일을 선택하세요.');
      return;
    }

    setBusy(true);

    try {
      await api('/me/resume', { method: 'PUT', body });
      form.reset();
      setSelectedName('');
      setConfirmDelete(false);
      // 업로드 성공은 화면 아래 글자 대신 공통 팝업으로 알려줍니다.
      setNotice('업로드되었습니다.');
      // 서버 내용이 바뀌었으므로 현재 이력서 정보를 다시 읽습니다.
      resume.retry();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 서버에 보관된 이력서를 삭제합니다.
  async function remove() {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      await api('/me/resume', { method: 'DELETE' });
      setConfirmDelete(false);
      setMessage('이력서를 삭제했습니다.');
      resume.retry();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="resume-panel">
      <h2>내 이력서</h2>
      <p>PDF 한 개를 보관할 수 있습니다. 최대 5MB이며 본인만 확인할 수 있습니다.</p>

      {/* 로딩 → 오류 → 정상 화면 순서로 하나만 보여줍니다. */}
      {resume.loading ? (
        <p role="status">이력서를 확인하는 중입니다…</p>
      ) : resume.error ? (
        <RequestError message={resume.error} onRetry={resume.retry} />
      ) : (
        <>
          {/* 이미 저장한 이력서가 있으면 파일정보와 다운로드/삭제 버튼을 보여줍니다. */}
          {resume.data ? (
            <div className="resume-current">
              <strong>{resume.data.filename}</strong>
              {' · '}
              {(resume.data.size / 1024).toFixed(1)}KB
              {' '}
              <a href={resumeDownloadUrl}>현재 PDF 다운로드</a>
              <button className="action-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>이력서 삭제</button>
            </div>
          ) : (
            <p>등록된 이력서가 없습니다.</p>
          )}

          <form onSubmit={upload}>
            <p className="resume-file-label" id="resume-file-label">PDF 이력서</p>

            <div className="resume-file-picker">
              {/* 실제 file input은 숨기고, 아래 버튼이 click()을 대신 실행합니다. */}
              <input
                ref={fileInput}
                className="resume-file-input"
                type="file"
                aria-labelledby="resume-file-label"
                name="file"
                accept=".pdf,application/pdf"
                hidden
                disabled={busy}
                onChange={event => setSelectedName(event.target.files?.[0]?.name || '')}
              />

              <button
                type="button"
                disabled={busy}
                aria-describedby="resume-file-label resume-file-name"
                onClick={() => fileInput.current?.click()}
              >
                파일 선택
              </button>

              <span id="resume-file-name" aria-live="polite">
                {selectedName || '선택된 파일 없음'}
              </span>
            </div>

            <button className="primary-action" disabled={busy}>
              {busy ? '처리 중…' : resume.data ? '선택한 PDF로 교체' : '이력서 업로드'}
            </button>
          </form>

          {/* 실수로 바로 지우지 않도록 한 번 더 확인합니다. */}
          {confirmDelete && (
            <div className="delete-confirm">
              보관 중인 이력서를 삭제할까요?
              <button className="action-danger" disabled={busy} onClick={remove}>삭제 확인</button>
              <button disabled={busy} onClick={() => setConfirmDelete(false)}>유지</button>
            </div>
          )}
        </>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
