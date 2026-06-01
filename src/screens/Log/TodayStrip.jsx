import { fmtDurationShort, useTicker } from '../../helpers';
import { selectTodayStripSummary } from '../../state';

export default function TodayStrip({ state }) {
  const now = useTicker(1000);
  const summary = selectTodayStripSummary(state, now);

  return (
    <div className="il-todaystrip">
      <div className="il-todaystrip-head">
        <span className="label">今日の時間</span>
        <span className="il-mono value">{fmtDurationShort(summary.total)}</span>
      </div>

      <div className="il-hbar">
        <span style={{ width: `${summary.percentages.task}%`, background: 'var(--task)' }} />
        <span style={{ width: `${summary.percentages.interrupt}%`, background: 'var(--interrupt)' }} />
        <span style={{ width: `${summary.percentages.break}%`, background: 'var(--break)' }} />
        <span style={{ width: `${summary.percentages.unknown}%`, background: 'var(--unknown)' }} />
      </div>

      <div className="il-todaystrip-legend">
        <LegendDot color="var(--task)" label="集中" value={fmtDurationShort(summary.task)} />
        <LegendDot color="var(--interrupt)" label="割り込み" value={fmtDurationShort(summary.interrupt)} />
        <LegendDot color="var(--break)" label="休憩" value={fmtDurationShort(summary.break)} />
        {summary.unknown > 0 && <LegendDot color="var(--unknown)" label="未分類" value={fmtDurationShort(summary.unknown)} />}
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }) {
  return (
    <span className="il-todaystrip-item">
      <span className="swatch" style={{ background: color }} />
      <span>{label}</span>
      <span className="il-mono amount">{value}</span>
    </span>
  );
}
