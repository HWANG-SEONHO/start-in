import RequestError from '../components/RequestError';
// 학습용 설명: 공고 하나의 자세한 내용을 보여주는 페이지입니다.
// 큰 흐름: URL의 :id 읽기 → GET /jobs/:id → 상세 표시 → 저장/지원현황 기능 연결.

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import { useAccount } from '../services/AccountContext';
import { api } from '../services/api';
import { salaryLabel } from '../services/format';
import SaveButton from '../components/SaveButton';
export default function JobDetailPage() {
  // /jobs/123 주소의 123 부분이 id입니다.
  const {
    id
  } = useParams();
  const {
    data: job,
    loading,
    error,
    retry
  } = useResource(`/jobs/${id}`);
  const {
    user
  } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // 현재 공고를 MY 지원현황에 "준비중" 상태로 추가합니다.
  async function addApplication() {
    // 로그인하지 않았다면 먼저 로그인한 뒤 이 공고로 돌아올 수 있게 현재 주소를 넘깁니다.
    if (!user) {
      navigate('/login', {
        state: {
          from: location.pathname
        }
      });
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      // 이미 지원현황에 있는 공고는 중복 생성하지 않습니다.
      const existing = await api('/me/applications');
      const alreadyAdded = existing.some(item => item.job.id === job.id);
      if (!alreadyAdded) {
        await api(`/me/applications/${job.id}`, {
          method: 'PUT',
          body: {
            status: '준비중',
            note: ''
          }
        });
      }

      // 새로 만든 기록일 때만 MY 화면에 job id를 넘겨 "방금 추가" 표시를 붙입니다.
      navigate('/my?tab=applications', {
        state: alreadyAdded ? null : {
          newApplicationJobId: job.id
        }
      });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  // label/value 배열을 사용하면 같은 <dt>/<dd> 모양을 반복 작성하지 않아도 됩니다.
  const facts = job ? [['지역', `${job.region} ${job.district}`], ['직무', job.category], ['급여', salaryLabel(job)], ['경력', job.experience], ['학력', job.education], ['고용형태', job.employment], ['근무형태', job.work_mode], ['마감일', job.deadline]] : [];
  return <main className="service-page">
      <Link to="/jobs">← 공고 목록</Link>

      {loading ? <p role="status">공고를 불러오는 중입니다…</p> : error ? <RequestError message={error} onRetry={retry} /> : <>
          {job.is_demo && <p className="demo-notice">
              데모 공고입니다. 실제 채용·지원 접수가 이루어지지 않습니다.
            </p>}

          <div className="detail-heading">
            <div>
              <Link to={`/companies/${job.company_id}`}>{job.company}</Link>
              <h1>{job.title}</h1>
            </div>
            <SaveButton job={job} />
          </div>

          <dl className="job-facts">
            {facts.map(([label, value]) => <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>)}
          </dl>

          <p className="detail-description">{job.description}</p>

          <h2>근무조건 및 복리후생</h2>
          <p>{[...job.conditions, ...job.benefits].join(' · ')}</p>

          <button className="primary-action" onClick={addApplication} disabled={busy}>
            {busy ? '저장 중…' : 'MY 지원현황에 추가'}
          </button>

          {message && <p role="alert">{message}</p>}
        </>}
    </main>;
}
