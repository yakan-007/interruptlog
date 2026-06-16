import Icons from '../../icons';
import { t, tx, typeLabel } from '../../i18n';
import SheetShell from './SheetShell';

export default function RepairOverlapsSheet({ preview, locale = 'ja-JP', onDefer, onApply }) {
  return (
    <SheetShell
      title={t(locale, 'sheets.repairTitle')}
      onClose={onDefer}
      footer={(
        <>
          <button className="btn tert" onClick={onDefer}>{t(locale, 'sheets.repairLater')}</button>
          <button className="btn primary" onClick={onApply}>{Icons.spark(14)} {t(locale, 'sheets.repairApply')}</button>
        </>
      )}
    >
      <div className="il-sheet-copy">
        {t(locale, 'sheets.repairCopy')}
      </div>

      <div className="il-resolution-summary">
        <span className="il-chip warn">{tx(locale, 'sheets.overlapCount', preview.conflicts.length)}</span>
        <span className="il-chip">{tx(locale, 'sheets.changeCount', preview.changes.length)}</span>
      </div>

      <div className="il-resolution-list">
        {preview.changes.map((change) => (
          <div key={`${change.sourceEventId}-${change.action}`} className="il-resolution-card">
            <div className="top">
              <span className={`il-chip ${change.action === 'remove' ? 'danger' : 'accent'}`}>{changeLabel(locale, change.action)}</span>
              <span className="event">{change.before?.label ?? typeLabel(locale, 'unknown')}</span>
            </div>
            <ChangePreview before={change.before} after={change.after} locale={locale} />
          </div>
        ))}
      </div>
    </SheetShell>
  );
}

const CHANGE_LABELS_JA = {
  'trim-start': '開始を短縮',
  'trim-end': '終了を短縮',
  'trim-both': '前後を短縮',
  split: '前後に分割',
  remove: '削除',
  merge: '前後を統合',
  insert: '追加',
};
const CHANGE_LABELS_EN = {
  'trim-start': 'Trim start',
  'trim-end': 'Trim end',
  'trim-both': 'Trim both',
  split: 'Split',
  remove: 'Remove',
  merge: 'Merge',
  insert: 'Add',
};

function ChangePreview({ before, after, locale }) {
  return (
    <div className="il-resolution-compare">
      <div className="side before">
        <div className="label">{t(locale, 'sheets.before')}</div>
        {before ? <div className="line">{formatEventLine(before)}</div> : <div className="line muted">{t(locale, 'sheets.added')}</div>}
      </div>
      <div className="arrow" aria-hidden="true">→</div>
      <div className="side after">
        <div className="label">{t(locale, 'sheets.after')}{afterCount(after) > 1 ? ` · ${afterCount(after)}` : ''}</div>
        {renderAfter(after, locale)}
      </div>
    </div>
  );
}

function renderAfter(after, locale) {
  if (!after) return <div className="line muted">{t(locale, 'sheets.removed')}</div>;
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
  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}:${padTime(date.getSeconds())}`;
}

function formatMonthDayTime(date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}

function padTime(value) {
  return String(value).padStart(2, '0');
}

function changeLabel(locale, action) {
  return (locale === 'ja-JP' ? CHANGE_LABELS_JA : CHANGE_LABELS_EN)[action] ?? action;
}
