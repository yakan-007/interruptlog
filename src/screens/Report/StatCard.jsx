export default function StatCard({
  label,
  color,
  value,
  previousValue = 0,
  deltaLabel,
  deltaInvert,
  locale = 'ja-JP',
  kind = 'duration',
}) {
  const stat = kind === 'count' ? formatCountStat(value, locale) : formatDurationStat(value);
  const delta = value - previousValue;
  const deltaPositive = delta > 0;
  const cls = delta === 0 ? 'flat' : ((deltaInvert ? !deltaPositive : deltaPositive) ? 'down' : 'up');

  return (
    <div className="il-card il-statcard">
      <div className="il-statcard-head">
        <span className="swatch" style={{ background: color }} />
        <span className="label">{label}</span>
      </div>
      <div className="il-stat il-mono">{stat.value}<span className="unit">{stat.unit}</span></div>
      <div className={'il-delta ' + cls}>
        <span className="delta-label">{deltaLabel} </span>{formatDelta(delta, kind, stat.unit, locale)}
      </div>
    </div>
  );
}

function formatDurationStat(ms) {
  const value = Math.max(0, ms);
  if (value > 0 && value < 60000) return { value: '<1', unit: 'm' };
  const hours = value / 3600000;
  if (hours >= 1) return { value: hours.toFixed(1), unit: 'h' };
  return { value: String(Math.round(value / 60000)), unit: 'm' };
}

function formatCountStat(count, locale) {
  return {
    value: String(count),
    unit: locale === 'ja-JP' ? '件' : '',
  };
}

function formatDelta(delta, kind, currentUnit, locale) {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const abs = Math.abs(delta);
  if (kind === 'count') {
    const unit = locale === 'ja-JP' ? '件' : '';
    return `${sign}${abs}${unit}`;
  }
  if (currentUnit === 'h') return `${sign}${(abs / 3600000).toFixed(1)}h`;
  if (abs > 0 && abs < 60000) return `${sign}<1m`;
  return `${sign}${Math.round(abs / 60000)}m`;
}
