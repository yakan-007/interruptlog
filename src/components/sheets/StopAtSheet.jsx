import { useState } from 'react';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/datetime';
import { t, translateError } from '../../i18n';
import { selectForgottenTimer } from '../../state';
import SheetShell from './SheetShell';

// Stop the running timer at a past moment, for a timer left running by mistake.
export default function StopAtSheet({ state, actions, onClose }) {
  const locale = state.preferences.locale;
  const [initialNow] = useState(() => Date.now());
  const [value, setValue] = useState(() => toDateTimeLocalValue(
    selectForgottenTimer(state, initialNow)?.suggestedEnd ?? initialNow
  ));
  const [error, setError] = useState('');
  const runningStart = state.running?.start ?? null;

  const submit = () => {
    const result = actions.endRunningAt(fromDateTimeLocalValue(value));
    if (!result.ok) setError(translateError(locale, result.errorCode));
  };

  return (
    <SheetShell title={t(locale, 'sheets.stopAtTitle')} onClose={onClose} locale={locale} footer={
      <>
        <button className="btn tert" onClick={onClose}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn primary" onClick={submit}>{t(locale, 'sheets.stopAtSubmit')}</button>
      </>
    }>
      <div className="il-sheet-copy">{t(locale, 'sheets.stopAtCopy')}</div>
      <div className="il-field">
        <label htmlFor="il-stop-at">{t(locale, 'sheets.stopAtLabel')}</label>
        <input
          id="il-stop-at"
          className="il-input"
          type="datetime-local"
          value={value}
          min={runningStart ? toDateTimeLocalValue(runningStart) : undefined}
          max={toDateTimeLocalValue(initialNow)}
          onChange={(event) => { setValue(event.target.value); setError(''); }}
        />
      </div>
      {error && <div className="il-inline-error">{error}</div>}
    </SheetShell>
  );
}
