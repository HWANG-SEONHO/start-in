// 학습용 설명: 공고가 많을 때 이전/다음 페이지로 움직이는 작은 버튼 부품입니다.
// 핵심 흐름: 현재 page 확인 → 이전/다음 버튼 클릭 → 부모에게 새 page 번호 전달.

export default function Pagination({
  page,
  totalPages,
  onPage,
  label = '공고 페이지'
}) {
  // 한 페이지여도 이동칸을 유지해 검색 결과가 바뀔 때 화면이 뛰지 않습니다.
  const pages = Math.max(1, totalPages);
  return <nav className="pagination" aria-label={label}>
      {/* 1페이지에서는 더 앞 페이지가 없으므로 이전 버튼을 잠급니다. */}
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </button>

      {/* aria-live는 페이지 숫자가 바뀌었음을 화면읽기 프로그램에도 알려줍니다. */}
      <span aria-live="polite">{Math.min(page, pages)} / {pages} 페이지</span>

      {/* 마지막 페이지에서는 더 뒤 페이지가 없으므로 다음 버튼을 잠급니다. */}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        다음
      </button>
    </nav>;
}
