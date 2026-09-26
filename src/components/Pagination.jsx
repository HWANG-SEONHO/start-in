export default function Pagination({ page, totalPages, onPage, label = '공고 페이지' }) {
  if (totalPages <= 1) return null;
  return <nav className="pagination" aria-label={label}>
    <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>이전</button>
    <span aria-live="polite">{page} / {totalPages} 페이지</span>
    <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>다음</button>
  </nav>;
}
