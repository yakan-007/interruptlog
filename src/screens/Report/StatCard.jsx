import { t } from '../../i18n';

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
  const parts = kind === 'count' ? [formatCountStat(value, locale)] : formatDurationStat(value);
  const delta = value - previousValue;
  const deltaPositive = delta > 0;
  const cls = delta === 0 ? 'flat' : ((deltaInvert ? !deltaPositive : deltaPositive) ? 'down' : 'up');

  return (
    <div className="il-card il-statcard">
      <div className="il-statcard-head">
        <span className="swatch" style={{ background: color }} />
        <span className="label">{label}</span>
      </div>
      <div className="il-stat il-mono">
        {parts.map((part) => <span key={part.unit}>{part.value}<span className="unit">{part.unit}</span></span>)}
      </div>
      <div className={'il-delta ' + cls}>
        <span className="delta-label">{deltaLabel} </span>{formatDelta(delta, kind, locale)}
      </div>
    </div>
  );
}

// Same reading as every other duration in the app: "3h 55m", not "3.9h".
function formatDurationStat(ms) {
  const value = Math.max(0, ms);
  if (value > 0 && value < 60000) return [{ value: '<1', unit: 'm' }];
  const totalMinutes = Math.floor(value / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return [{ value: String(minutes), unit: 'm' }];
  return [{ value: String(hours), unit: 'h' }, { value: String(minutes), unit: 'm' }];
}

function formatCountStat(count, locale) {
  return {
    value: String(count),
    unit: countUnit(locale),
  };
}

function formatDelta(delta, kind, locale) {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const abs = Math.abs(delta);
  if (kind === 'count') return `${sign}${abs}${countUnit(locale)}`;
  if (abs > 0 && abs < 60000) return `${sign}<1m`;
  return `${sign}${formatDurationStat(abs).map((part) => `${part.value}${part.unit}`).join(' ')}`;
}

function countUnit(locale) {
  return t(locale, 'common.countUnit');
}
