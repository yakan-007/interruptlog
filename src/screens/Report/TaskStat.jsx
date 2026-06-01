export default function TaskStat({ label, value, accent }) {
  return (
    <div className="il-taskstat">
      <div className="label">{label}</div>
      <div className={'il-mono value' + (accent ? ' accent' : '')}>{value}</div>
    </div>
  );
}
