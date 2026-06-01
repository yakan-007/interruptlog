import Icons from '../../icons';

export default function HistoryHeader({ onAddMissed }) {
  return (
    <div className="il-topbar">
      <div>
        <div className="sub">HISTORY</div>
        <h1>イベント履歴</h1>
      </div>
      <div className="actions">
        <button className="il-iconbtn" onClick={onAddMissed} aria-label="押し忘れを記録">{Icons.plus(18)}</button>
      </div>
    </div>
  );
}
