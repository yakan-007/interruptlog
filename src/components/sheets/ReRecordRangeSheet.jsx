import { useState } from 'react';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { t, translateMessage } from '../../i18n';
import TaskTargetFields from '../../screens/History/TaskTargetFields';
import SheetShell from './SheetShell';

export default function ReRecordRangeSheet({ state, actions, onClose, initialDraft }) {
  const locale = state.preferences.locale;
  const [startAt, setStartAt] = useState(() => toDateTimeLocalValue(initialDraft?.start ?? Date.now()));
  const [endAt, setEndAt] = useState(() => toDateTimeLocalValue(initialDraft?.end ?? Date.now()));
  const [workDetail, setWorkDetail] = useState(initialDraft?.workDetail ?? '');
  const [memo, setMemo] = useState(initialDraft?.memo ?? '');
  const [taskTarget, setTaskTarget] = useState(initialDraft?.taskTarget ?? {
    mode: state.tasks.length ? 'existing' : 'new',
    taskId: state.tasks.find((task) => !task.isCompleted)?.id ?? state.tasks[0]?.id ?? null,
    name: '',
    categoryId: state.categories[0]?.id ?? null,
    complete: false,
  });
  const [error, setError] = useState('');

  const review = () => {
    const record = {
      type: 'task',
      start: fromDateTimeLocalValue(startAt),
      end: fromDateTimeLocalValue(endAt),
      workDetail,
      memo,
      taskTarget,
    };
    if (record.start == null || record.end == null) {
      setError(t(locale, 'sheets.dateCheck'));
      return;
    }
    const result = actions.previewReplaceTimeRange(record);
    if (result.error || !result.preview) {
      setError(translateMessage(locale, result.error ?? t(locale, 'errors.checkInput')));
      return;
    }
    actions.openSheet('confirmReRecord', { record, preview: result.preview, impact: result.impact });
  };

  return (
    <SheetShell
      title={t(locale, 'sheets.reRecordRange')}
      onClose={onClose}
      footer={(
        <>
          <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
          <button className="btn primary" onClick={review}>{t(locale, 'sheets.reviewChanges')}</button>
        </>
      )}
    >
      <div className="il-sheet-copy">{t(locale, 'sheets.reRecordRangeCopy')}</div>
      <div className="il-inline-fields">
        <div className="il-field">
          <label>{t(locale, 'sheets.start')}</label>
          <input className="il-input il-mono" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        </div>
        <div className="il-field">
          <label>{t(locale, 'sheets.end')}</label>
          <input className="il-input il-mono" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
        </div>
      </div>
      <TaskTargetFields
        state={state}
        value={taskTarget}
        onChange={(next) => { setError(''); setTaskTarget(next); }}
        suggestedName={workDetail}
        locale={locale}
      />
      <div className="il-field">
        <label>{t(locale, 'sheets.workDetail')}</label>
        <input className="il-input" placeholder={t(locale, 'sheets.workDetailPlaceholder')} value={workDetail} onChange={(event) => setWorkDetail(event.target.value)} />
      </div>
      <div className="il-field">
        <label>{t(locale, 'sheets.memo')}</label>
        <textarea className="il-textarea" value={memo} onChange={(event) => setMemo(event.target.value)} />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
