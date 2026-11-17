// A destructive step asks in place: the footer says what will happen, and its
// final button is the only red-filled button a sheet ever shows.
export default function ConfirmFooter({ message, backLabel, confirmLabel, onBack, onConfirm }) {
  return (
    <>
      <div className="il-sheet-confirm">{message}</div>
      <button className="btn tert" onClick={onBack}>{backLabel}</button>
      <button className="btn danger fill" onClick={onConfirm}>{confirmLabel}</button>
    </>
  );
}
