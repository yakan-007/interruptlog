import SheetShell from './SheetShell';
import { TYPE_LABELS } from '../../state';

export default function ResolveEventSheet({ resolution, onBack, onConfirm }) {
  const { preview, confirmLabel = '保存する' } = resolution;

  return (
    <SheetShell
      title="重なりを確認"
      onClose={onBack}
      footer={(
        <>
          <button className="btn tert" onClick={onBack}>戻る</button>
          <button className="btn primary" onClick={() => onConfirm(resolution)}>{confirmLabel}</button>
        </>
      )}
    >
      <div className="il-sheet-copy">
        保存するイベントが既存の履歴と重なっています。確定すると、重なったイベントを分割・短縮して単一のタイムラインに整えます。
      </div>

      <div className="il-resolution-focus">
        <div className="eyebrow">保存するイベント</div>
        <div className="title">{preview.candidate.label}</div>
        <div className="meta">
          <span>{TYPE_LABELS[preview.candidate.type] ?? 'イベント'}</span>
          <span>{formatEventWindow(preview.candidate)}</span>
        </div>
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
              <span className="event">{(change.before?.label ?? firstAfterLabel(change.after) ?? 'イベント')}</span>
            </div>
            <ChangePreview before={change.before} after={change.after} />
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
  remove: '上書きで削除',
  merge: '前後を統合',
  insert: '追加',
};

function ChangePreview({ before, after }) {
  return (
    <div className="il-resolution-compare">
      <div className="side before">
        <div className="label">整理前</div>
        {before ? <div className="line">{formatEventLine(before)}</div> : <div className="line muted">新しく追加されます</div>}
      </div>
      <div className="arrow" aria-hidden="true">→</div>
      <div className="side after">
        <div className="label">整理後{afterCount(after) > 1 ? ` · ${afterCount(after)}本` : ''}</div>
        {renderAfter(after)}
      </div>
    </div>
  );
}

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

function afterCount(after) {
  if (!after) return 0;
  return Array.isArray(after) ? after.length : 1;
}

function firstAfterLabel(after) {
  if (Array.isArray(after)) return after[0]?.label ?? null;
  return after?.label ?? null;
}

function formatEventLine(event) {
  return `${formatEventWindow(event)}  ${event.label}`;
}

function formatEventWindow(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = sameDay
    ? formatTime(start)
    : formatMonthDayTime(start);
  const endLabel = sameDay
    ? formatTime(end)
    : formatMonthDayTime(end);
  return `${startLabel} - ${endLabel}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMonthDayTime(date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}
