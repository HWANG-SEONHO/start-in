export function salaryLabel(job) {
  if (!job.salary_min) return '회사내규';
  const unit = job.salary_type === '시급' || job.salary_type === '일급' ? '원' : '만원';
  return `${job.salary_type} ${job.salary_min.toLocaleString()} ~ ${job.salary_max.toLocaleString()}${unit}`;
}
export function deadlineLabel(deadline) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const remaining = Math.round((new Date(`${deadline}T00:00:00`) - today) / 86400000);
  return remaining < 0 ? '마감' : remaining === 0 ? '오늘 마감' : `D-${remaining}`;
}
