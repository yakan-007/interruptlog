import { fmtDuration } from '../../lib/formatters';
import { useTicker } from '../../lib/ticker';
import { t, tx } from '../../i18n';
import SheetShell from './SheetShell';

export default function BreakSheet({ state, actions, onClose }) {
  const now = useTicker(1000);
  const presets = [5, 10, 15, 30, 45];
  const locale = state.preferences.locale;

  const runTask = state.tasks.find((task) => task.id === state.running?.preTaskId);
  const elapsed = Math.max(0, now - (state.running?.start ?? now));
  const planned = state.running?.type === 'break' ? Math.max(0, state.running.plannedBreakDurationMinutes ?? 0) : 0;
  const plannedMs = planned * 60000;
  const overMs = plannedMs > 0 ? elapsed - plannedMs : 0;
  const tone = plannedMs <= 0 ? 'free' : overMs >= 120000 ? 'late' : overMs >= 0 ? 'warn' : 'target';
  const timerMeta = plannedMs <= 0
    ? t(locale, 'sheets.noTarget')
    : overMs >= 0
      ? (overMs < 60000 ? t(locale, 'sheets.overTarget') : `+${fmtDuration(overMs, { showSec: overMs < 60000, locale })}`)
      : tx(locale, 'sheets.targetMinutes', planned);

  return (
    <SheetShell title={t(locale, 'sheets.breakTitle')} onClose={onClose} footer={
      <>
        <button className="btn tert" onClick={() => actions.cancelInterrupt()}>{t(locale, 'sheets.cancel')}</button>
        <button className="btn secondary" onClick={() => actions.saveBreak({ breakDurationMinutes: planned, resume: false })}>{t(locale, 'sheets.saveAndEnd')}</button>
        <button className="btn primary" onClick={() => actions.saveBreak({ breakDurationMinutes: planned, resume: true })}>{t(locale, 'sheets.saveAndResume')}</button>
      </>
    }>
      {runTask && (
        <div className="il-sheet-infobox">
          <div className="dot muted" />
          <div className="meta">
            <span className="strong">{t(locale, 'sheets.pausedTask')}</span> <span>{runTask.name}</span>
          </div>
          <div className="il-mono quiet">{t(locale, 'sheets.paused')}</div>
        </div>
      )}

      <div className={'il-sheet-timer break' + (plannedMs > 0 ? ' has-target' : '') + (tone === 'warn' ? ' warn' : '') + (tone === 'late' ? ' late' : '')}>
        <div className="eyebrow">{t(locale, 'sheets.breakActive')}</div>
        <div className="value il-mono">{fmtDuration(elapsed, { showSec: true, locale })}</div>
        <div className="hint">{timerMeta}</div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.breakTarget')}</label>
        <div className="il-sheet-copy">
          {t(locale, 'sheets.breakTargetCopy')}
        </div>
        <div className="il-breakpreset-row">
          {presets.map((minutes) => (
            <button
              key={minutes}
              className={'il-breakpreset' + (planned === minutes ? ' active' : '')}
              onClick={() => actions.setBreakTarget(minutes)}
            >
              {minutes}{t(locale, 'sheets.minutes')}
            </button>
          ))}
        </div>
      </div>

      <div className="il-field">
        <label>{t(locale, 'sheets.adjustMinutes')}</label>
        <div className="il-breakplan-row">
          <input className="il-input short" type="number" value={planned} onChange={(event) => actions.setBreakTarget(Number(event.target.value) || 0)} />
          <span className="suffix">{t(locale, 'sheets.minutes')}</span>
        </div>
      </div>
    </SheetShell>
  );
}
