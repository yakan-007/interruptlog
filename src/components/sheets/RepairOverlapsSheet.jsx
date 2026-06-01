import Icons from '../../icons';
import SheetShell from './SheetShell';

export default function RepairOverlapsSheet({ preview, onDefer, onApply }) {
  return (
    <SheetShell
      title="重複イベントを整理"
      onClose={onDefer}
      footer={(
        <>
          <button className="btn tert" onClick={onDefer}>後で確認</button>
          <button className="btn primary" onClick={onApply}>{Icons.spark(14)} 整理して適用</button>
        </>
      )}
    >
      <div className="il-sheet-copy">
        保存済みデータに重なっているイベントがあります。整理すると、後から記録されたイベントを優先して単一のタイムラインへ整えます。
      </div>

      <div className="il-resolution-summary">
        <span className="il-chip warn">{preview.conflicts.length}件の重複</span>
        <span className="il-chip">{preview.changes.length}件の変更</span>
      </div>

      <div className="il-resolution-list">
        {preview.changes.map((change) => (
          <div key={`${change.sourceEventId}-${change.action}`} className="il-resolution-card">
            <div className="top">
              <span className={`il-chip ${change.action === 'remove' ? 'danger' : 'accent'}`}>{CHANGE_LABELS[change.action] ?? change.action}</span>
              <span className="event">{change.before?.label ?? 'イベント'}</span>
            </div>
            {change.before && <div className="before">{formatEventLine(change.before)}</div>}
            <div className="after">{renderAfter(change.after)}</div>
          </div>
        ))}
      </div>
    </SheetShell>
  );
}

const CHANGE_LABELS = {
  'trim-start': '開始を短縮',
  'trim-end': '終了を短縮',
  'trim-both': '前後を短縮',
  split: '前後に分割',
  remove: '削除',
  merge: '前後を統合',
  insert: '追加',
};

function renderAfter(after) {
  if (!after) return <div className="line muted">削除されます</div>;
  if (Array.isArray(after)) {
    return (
      <>
        {after.map((item) => (
          <div key={item.id} className="line">{formatEventLine(item)}</div>
        ))}
      </>
    );
  }
  return <div className="line">{formatEventLine(after)}</div>;
}

function formatEventLine(event) {
  return `${formatEventWindow(event)}  ${event.label}`;
}

function formatEventWindow(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = sameDay ? formatTime(start) : formatMonthDayTime(start);
  const endLabel = sameDay ? formatTime(end) : formatMonthDayTime(end);
  return `${startLabel} - ${endLabel}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMonthDayTime(date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}
