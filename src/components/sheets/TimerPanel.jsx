import { formatElapsedClock } from '../../lib/timer';

// Elapsed time reads the same everywhere a timer runs: HH:MM:SS, as on the
// running bar.

export default function TimerPanel({ className, elapsed, hint }) {
  return (
    <div className={className}>
      <div className="value il-mono">{formatElapsedClock(elapsed)}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
