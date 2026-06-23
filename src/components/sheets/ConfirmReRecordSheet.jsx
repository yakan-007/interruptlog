import { useState } from 'react';
import { fmtDurationShort } from '../../lib/formatters';
import { t, typeLabel } from '../../i18n';
import SheetShell from './SheetShell';

export default function ConfirmReRecordSheet({ state, actions, data, onBack, onConfirm }) {
  const locale = state.preferences.locale;
  const [targetName, targetMeta] = describeTarget(data.record, state, locale);
  const { impact = { items: [], unrecordedMs: 0 } } = data;
  const [error, setError] = useState('');

  const confirm = () => {
    const result = actions.replaceTimeRange(data.record);
    if (result.ok) onConfirm({ previousState: result.previousState, state: result.state });
    else setError(result.error ?? t(locale, 'errors.checkInput'));
  };

  return (
    <SheetShell
      title={t(locale, 'sheets.reRecordRange')}
      onClose={onBack}
      footer={(
        <>
          <button className="btn tert" onClick={onBack}>{t(locale, 'sheets.back')}</button>
          <button className="btn primary" onClick={confirm}>{t(locale, 'sheets.reRecordConfirm')}</button>
        </>
      )}
    >
      <div className="il-resolution-focus">
        <div className="eyebrow">{t(locale, 'sheets.newRecord')}</div>
        <div className="title">{targetName}</div>
        <div className="meta">
          <span>{targetMeta}</span>
          <span>{formatRecordRange(data.record.start, data.record.end, locale)}</span>
        </div>
      </div>
      <div className="il-sheet-copy">{t(locale, 'sheets.reRecordConfirmCopy')}</div>
      <div className="il-rerecord-impact">
        <div className="il-rerecord-impact-title">{t(locale, 'sheets.replacedRecords')}</div>
        {impact.items.length === 0 ? (
          <div className="il-report-taskempty">{t(locale, 'sheets.noRecordsInRange')}</div>
        ) : impact.items.map((item) => (
          <div className="il-rerecord-impact-row" key={item.id}>
            <span className={'dot t-' + item.type} />
            <span className="main"><strong>{item.label}</strong><small>{typeLabel(locale, item.type)}</small></span>
            <span className="il-mono">{fmtDurationShort(item.durationMs, locale)}</span>
          </div>
        ))}
        {impact.unrecordedMs > 0 && (
          <div className="il-rerecord-impact-row gap">
            <span className="dot" />
            <span className="main"><strong>{t(locale, 'sheets.unrecordedTime')}</strong></span>
            <span className="il-mono">{fmtDurationShort(impact.unrecordedMs, locale)}</span>
          </div>
        )}
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}

function describeTarget(record, state, locale) {
  if (record.taskTarget?.mode === 'existing') {
    const task = state.tasks.find((item) => item.id === record.taskTarget.taskId);
    return [task?.name ?? t(locale, 'sheets.task'), t(locale, 'sheets.existingTask')];
  }
  if (record.taskTarget?.mode === 'new') return [record.taskTarget.name || t(locale, 'sheets.task'), t(locale, 'sheets.newTask')];
  return [record.workDetail || t(locale, 'sheets.recordOnlyWork'), t(locale, 'sheets.noTask')];
}

function formatRecordRange(start, end, locale) {
  const date = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  return `${date.format(new Date(start))} – ${time.format(new Date(end))}`;
}
