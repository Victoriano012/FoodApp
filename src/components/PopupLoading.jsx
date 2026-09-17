export default function PopupLoading() {
  return (
    <div className="popup-overlay" role="status" aria-live="polite">
      <div className="popup">Loading recipe…</div>
    </div>
  );
}
