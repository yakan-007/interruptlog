import { fmtDuration } from '../../lib/formatters';

export default function TimerPanel({ className, elapsed, eyebrow, hint, locale }) {
  return (
    <div className={className}>
      <div className="eyebrow">{eyebrow}</div>
      <div className="value il-mono">{fmtDuration(elapsed, { showSec: true, locale })}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
