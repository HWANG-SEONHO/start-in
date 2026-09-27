// 학습용 설명: 공고를 저장하거나 저장 해제하는 버튼 부품입니다.
// 핵심 흐름: 로그인 확인 → 이미 저장됐는지 확인 → 저장/삭제 요청 실행.

import { useLocation, useNavigate } from 'react-router-dom';
import { useAccount } from '../services/AccountContext';

export default function SaveButton({ job }) {
  // AccountContext에서 로그인 상태와 저장공고 목록, 저장 함수 등을 가져옵니다.
  const { user, ready, savedJobs, pendingIds, toggleSaved } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  // 같은 공고 id가 저장목록에 있으면 saved가 true입니다.
  const saved = savedJobs.some(item => item.id === job.id);

  // 북마크 버튼을 눌렀을 때 실행되는 함수입니다.
  function save() {
    // 로그인이 안 되어 있으면 현재 주소를 기억한 채 로그인 화면으로 보냅니다.
    if (!user) {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      });
      return;
    }

    // 로그인 상태라면 저장/저장해제를 AccountContext에 맡깁니다.
    toggleSaved(job);
  }

  return (
    <button
      type="button"
      className={`job-bookmark${saved ? ' is-saved' : ''}`}
      // 계정 확인 전이거나 같은 공고 요청이 진행 중이면 중복 클릭을 막습니다.
      disabled={!ready || pendingIds.has(job.id)}
      aria-pressed={saved}
      aria-label={`${job.title} ${saved ? '저장 취소' : '저장'}`}
      onClick={save}
    >
      <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} aria-hidden="true">
        <path
          d="M6 3.5h12v17l-6-4.5-6 4.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
