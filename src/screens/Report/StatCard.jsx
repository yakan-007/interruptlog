export default function StatCard({ label, color, value, delta, deltaLabel, deltaInvert }) {
  const hours = value / 3600000;
  const display = hours >= 1 ? hours.toFixed(1) : (value / 60000).toFixed(0);
  const unit = hours >= 1 ? 'h' : 'm';
  const deltaPositive = delta > 0;
  const cls = delta === 0 ? 'flat' : ((deltaInvert ? !deltaPositive : deltaPositive) ? 'down' : 'up');

  return (
    <div className="il-card il-statcard">
      <div className="il-statcard-head">
        <span className="swatch" style={{ background: color }} />
        <span className="label">{label}</span>
      </div>
      <div className="il-stat il-mono">{display}<span className="unit">{unit}</span></div>
      <div className={'il-delta ' + cls}>
        <span className="delta-label">{deltaLabel} </span>{delta > 0 && '+'}{delta.toFixed(1)}h
      </div>
    </div>
  );
}
