export default function RequestError({
  message,
  onRetry
}) {
  return <div className="request-error" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>다시 시도</button>
    </div>;
}
