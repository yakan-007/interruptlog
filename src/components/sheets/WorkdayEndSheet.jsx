import { useState } from 'react';
import { isWorkSchedule, workdayKey } from '../../lib/workday';
import { getEffectiveWorkdaySchedule } from '../../state';
import { t } from '../../i18n';
import SheetShell from './SheetShell';

export default function WorkdayEndSheet({ state, actions, onClose }) {
  const locale = state.preferences.locale;
  const standard = state.preferences.workSchedule;
  const configured = isWorkSchedule(standard);
  const today = getEffectiveWorkdaySchedule(state);
  const [start, setStart] = useState(standard.start ?? '');
  const [end, setEnd] = useState(today?.end ?? standard.end ?? '');
  const [error, setError] = useState('');
  const hasOverride = configured && state.workdaySchedules?.[workdayKey()]?.end !== standard.end;

  const save = () => {
    const next = { start, end };
    if (!isWorkSchedule(next)) {
      setError(t(locale, 'settings.workScheduleInvalid'));
      return;
    }
    if (configured) actions.setTodayWorkdayEnd(end);
    else actions.setWorkSchedule(next);
    onClose();
  };

  const reset = () => {
    actions.clearTodayWorkdayEnd();
    onClose();
  };

  return (
    <SheetShell title={configured ? t(locale, 'sheets.todayEnd') : t(locale, 'settings.workSchedule')} onClose={onClose} footer={
      <>
        {hasOverride && <button className="btn tert" onClick={reset}>{t(locale, 'sheets.resetToStandard')}</button>}
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={save}>{t(locale, 'sheets.save')}</button>
      </>
    }>
      <div className="il-sheet-copy">
        {configured ? t(locale, 'sheets.todayEndCopy') : t(locale, 'settings.workScheduleNote')}
      </div>
      {!configured && (
        <div className="il-field">
          <label>{t(locale, 'settings.workStart')}</label>
          <input className="il-input" type="time" value={start} onChange={(event) => { setStart(event.target.value); setError(''); }} aria-label={t(locale, 'settings.workStart')} />
        </div>
      )}
      <div className="il-field">
        <label>{t(locale, 'settings.workEnd')}</label>
        <input className="il-input" type="time" value={end} onChange={(event) => { setEnd(event.target.value); setError(''); }} aria-label={t(locale, 'settings.workEnd')} autoFocus />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
