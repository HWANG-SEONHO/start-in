import RequestError from '../components/RequestError';
// 학습용 설명: 저장공고, 지원현황, 이력서를 한곳에서 관리하는 MY 페이지입니다.
// 큰 흐름: 로그인 확인 → tab 선택 → 저장공고/지원현황/이력서 중 하나 표시.

import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAccount } from '../services/AccountContext';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import JobCard from '../components/JobCard';
import ResumePanel from '../components/ResumePanel';

// 지원현황 한 건을 수정하거나 취소하는 작은 편집기입니다.
function ApplicationEditor({ application, index, isNew = false, onSaved }) {
  // 성공 안내는 페이지 안 글자가 아니라 앱 공통 팝업으로 보여줍니다.
  const { setNotice } = useAccount();
  // 서버에서 받은 기존 값을 input의 시작값으로 기억합니다.
  const [status, setStatus] = useState(application.status);
  const [note, setNote] = useState(application.note);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // save 또는 cancel 중 어떤 확인창을 열었는지 기억합니다.
  const [confirmAction, setConfirmAction] = useState('save');
  const confirmDialog = useRef(null);

  // 지원기록마다 id가 다르므로 dialog 설명 연결 id도 다르게 만듭니다.
  const dialogTitleId = `application-confirm-title-${application.id}`;
  const dialogDescriptionId = `application-confirm-description-${application.id}`;

  // 저장/지원취소 버튼을 누르면 바로 서버에 보내지 않고 먼저 확인창을 엽니다.
  function askConfirm(action) {
    setMessage('');
    setConfirmAction(action);
    confirmDialog.current?.showModal();
  }

  // remove=true면 DELETE, 아니면 현재 status/note를 PUT으로 저장합니다.
  async function save(remove = false) {
    setBusy(true);
    setMessage('');

    try {
      await api(`/me/applications/${application.job.id}`, {
        method: remove ? 'DELETE' : 'PUT',
        ...(remove ? {} : { body: { status, note } }),
      });

      confirmDialog.current?.close();
      // 사용자가 요청한 짧은 성공 팝업입니다.
      setNotice(remove ? '취소되었습니다.' : '저장되었습니다.');

      // 부모 목록을 다시 불러와 화면과 DB를 같은 상태로 맞춥니다.
      onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const removing = confirmAction === 'cancel';
  const allowedStatuses = [
    '준비중',
    '지원완료',
    '서류통과',
    '면접',
    '최종합격',
    '불합격',
    '취소',
  ];

  return (
    <article className={`application-item${isNew ? ' is-new-application' : ''}`}>
      {/* 사용자가 요청한 1, 2, 3... 번호입니다. */}
      <div className="application-number" aria-label={`${index + 1}번째 지원 기록`}>
        {index + 1}
      </div>

      <div className="application-content">
        <Link to={`/jobs/${application.job.id}`}>
          <strong>{application.job.title}</strong>
        </Link>
        {isNew && <span className="application-new-badge">방금 추가</span>}
        <p>{application.job.company} · {application.job.region}</p>

        <label>
          지원 상태
          <select value={status} onChange={event => setStatus(event.target.value)}>
            {allowedStatuses.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          메모
          <textarea
            value={note}
            maxLength={2000}
            onChange={event => setNote(event.target.value)}
          />
        </label>

        <div className="action-row">
          <button disabled={busy} onClick={() => askConfirm('save')}>변경 저장</button>
          <button disabled={busy} onClick={() => askConfirm('cancel')}>지원 취소</button>
        </div>

        {message && <p role="status">{message}</p>}
      </div>

      {/* 로그아웃 팝업과 같은 모양을 쓰는 저장/지원취소 확인 dialog입니다. */}
      <dialog
        ref={confirmDialog}
        className="logout-dialog application-dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        aria-busy={busy}
        onCancel={event => {
          if (busy) event.preventDefault();
        }}
        onClick={event => {
          if (event.target === event.currentTarget && !busy) {
            confirmDialog.current.close();
          }
        }}
      >
        <div className="logout-dialog-content">
          <div className="logout-dialog-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {removing ? (
                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5m4-5v5" />
              ) : (
                <path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6" />
              )}
            </svg>
          </div>

          <h2 id={dialogTitleId}>
            {removing ? '지원을 취소하시겠습니까?' : '저장하시겠습니까?'}
          </h2>

          <p id={dialogDescriptionId}>
            {removing ? (
              <>
                이 공고를 지원현황에서 제거합니다.<br />
                저장된 공고 자체는 삭제되지 않습니다.
              </>
            ) : (
              <>
                변경한 지원 상태와 메모를 저장합니다.<br />
                저장 후에도 언제든 다시 수정할 수 있습니다.
              </>
            )}
          </p>

          <div className="logout-dialog-actions">
            <button
              type="button"
              className="logout-cancel"
              autoFocus
              disabled={busy}
              onClick={() => confirmDialog.current.close()}
            >
              취소
            </button>

            <button
              type="button"
              className="logout-confirm"
              disabled={busy}
              onClick={() => save(removing)}
            >
              {busy ? '처리 중…' : removing ? '지원 취소' : '저장'}
            </button>
          </div>
        </div>
      </dialog>
    </article>
  );
}

// 로그인한 사용자의 MY 실제 내용을 보여주는 내부 화면입니다.
function AccountWorkspace() {
  const { user, savedJobs } = useAccount();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // 공고 상세에서 방금 만든 지원기록의 job id를 넘겨주면 그 한 건만 강조합니다.
  const newApplicationJobId = location.state?.newApplicationJobId ?? null;

  // URL의 ?tab= 값이 이상하면 저장공고 탭을 기본으로 씁니다.
  const requestedTab = params.get('tab');
  const tab = ['saved', 'applications', 'resume'].includes(requestedTab)
    ? requestedTab
    : 'saved';

  // 지원현황은 별도 API에서 가져옵니다.
  const applications = useResource('/me/applications');
  const applicationCount = applications.data?.length ?? 0;

  const tabs = [
    ['saved', `저장공고 ${savedJobs.length}`],
    ['applications', `지원현황 ${applicationCount}`],
    ['resume', '이력서'],
  ];

  return (
    <main className="service-page">
      <h1>{user.name}님의 MY</h1>

      {/* 탭도 URL에 저장해 새로고침해도 같은 탭을 유지합니다. */}
      <div className="my-tabs" aria-label="MY 메뉴">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setParams({ tab: value }, { preventScrollReset: true })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resume' && <ResumePanel />}

      {tab === 'saved' && (
        <>
          {savedJobs.map(job => <JobCard key={job.id} job={job} />)}
          {!savedJobs.length && (
            <p className="empty-results">
              저장한 공고가 없습니다. <Link to="/jobs">공고를 찾아 저장해 보세요.</Link>
            </p>
          )}
        </>
      )}

      {tab === 'applications' && (
        <>
          <p className="demo-notice">
            개인 지원 기록을 관리하는 공간입니다. 기업에 지원서가 제출되지는 않습니다.
          </p>

          {applications.loading ? (
            <p role="status">지원 기록을 불러오는 중입니다…</p>
          ) : applications.error ? (
            <RequestError message={applications.error} onRetry={applications.retry} />
          ) : (
            <>
              {applications.data.map((application, index) => (
                <ApplicationEditor
                  key={`${application.id}-${application.status}-${application.note}`}
                  application={application}
                  index={index}
                  isNew={application.job.id === newApplicationJobId}
                  onSaved={applications.retry}
                />
              ))}

              {!applications.data.length && (
                <p className="empty-results">
                  지원 기록이 없습니다. <Link to="/jobs">공고 상세에서 추가하세요.</Link>
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

// 바깥 MyPage는 로그인 여부만 확인하고 실제 화면은 AccountWorkspace에 맡깁니다.
export default function MyPage() {
  const { user, ready, loggedOut } = useAccount();

  if (!ready) {
    return <main className="service-page" role="status">계정을 확인하는 중입니다…</main>;
  }

  if (!user) {
    // 직접 로그아웃은 메인으로, 비로그인 접근·세션 만료는 로그인으로 보냅니다.
    return <Navigate to={loggedOut ? '/main' : '/login'} replace state={{ from: '/my' }} />;
  }

  // user.id를 key로 주면 다른 계정으로 바뀔 때 내부 상태도 새로 시작합니다.
  return <AccountWorkspace key={user.id} />;
}
