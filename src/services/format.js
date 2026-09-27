// 학습용 설명: 서버의 원시 값을 사람이 읽기 좋은 글자로 바꾸는 함수 모음입니다.

// 공고의 급여 숫자를 화면에 보여줄 한 줄 글자로 바꿉니다.
export function salaryLabel(job) {
  // salary_min이 0이면 정해진 숫자 대신 "회사내규"로 표시합니다.
  if (!job.salary_min) return '회사내규';

  // 시급/일급은 원, 연봉/월급은 이 프로젝트 데이터에서 만원 단위를 씁니다.
  const unit = job.salary_type === '시급' || job.salary_type === '일급'
    ? '원'
    : '만원';

  return `${job.salary_type} ${job.salary_min.toLocaleString()} ~ ${job.salary_max.toLocaleString()}${unit}`;
}

// 마감 날짜를 오늘 기준 D-day 글자로 바꿉니다.
export function deadlineLabel(deadline) {
  const now = new Date();

  // 시간 차이 때문에 하루가 어긋나지 않도록 오늘 날짜의 00:00으로 맞춥니다.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(`${deadline}T00:00:00`);
  const oneDayMs = 86_400_000;
  const remaining = Math.round((deadlineDate - today) / oneDayMs);

  if (remaining < 0) return '마감';
  if (remaining === 0) return '오늘 마감';
  return `D-${remaining}`;
}
