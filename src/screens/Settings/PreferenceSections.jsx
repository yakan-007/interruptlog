import { useState } from 'react';
import { SUPPORTED_LOCALES, t } from '../../i18n';
import { isWorkSchedule } from '../../lib/workday';
import SettingRow from './SettingRow';
import { ToggleSetting } from './SettingsRows';

export default function PreferenceSections({ state, actions, locale }) {
  return (
    <>
      <AppearanceSection state={state} actions={actions} locale={locale} />
      <BehaviorSection state={state} actions={actions} locale={locale} />
      <WorkdaySection state={state} actions={actions} locale={locale} />
    </>
  );
}

function AppearanceSection({ state, actions, locale }) {
  return (
    <>
      <div className="il-section-h"><span>{t(locale, 'settings.appearance')}</span></div>
      <div className="il-settings-group">
        <SettingRow title={t(locale, 'settings.language')}>
          <select
            className="il-settings-select"
            value={state.preferences.locale}
            onChange={(event) => actions.setLocale(event.target.value)}
            aria-label={t(locale, 'settings.language')}
          >
            {SUPPORTED_LOCALES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </SettingRow>
        <ToggleSetting title={t(locale, 'settings.darkMode')} value={state.preferences.dark} onToggle={() => actions.setDark(!state.preferences.dark)} ariaLabel={t(locale, 'settings.darkMode')} />
      </div>
    </>
  );
}

function BehaviorSection({ state, actions, locale }) {
  return (
    <>
      <div className="il-section-h"><span>{t(locale, 'settings.behavior')}</span></div>
      <div className="il-settings-group">
        <TaskOrderRow preferences={state.preferences} actions={actions} locale={locale} />
      </div>
    </>
  );
}

// One choice instead of two switches that could contradict each other:
// sorted by due date, or a hand-made order with new tasks on top or bottom.
function TaskOrderRow({ preferences, actions, locale }) {
  const current = preferences.taskOrder;
  const choose = (value) => actions.setTaskOrder(value);
  return (
    <div className="il-setrow il-settings-order">
      <div className="tg"><div className="t">{t(locale, 'settings.taskOrder')}</div></div>
      <div className="il-seg full" role="radiogroup" aria-label={t(locale, 'settings.taskOrder')}>
        {['due', 'top', 'bottom'].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={current === value}
            className={current === value ? 'active' : ''}
            onClick={() => choose(value)}
          >
            {t(locale, `settings.taskOrderOptions.${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkdaySection({ state, actions, locale }) {
  const [editing, setEditing] = useState(() => Boolean(
    state.preferences.workSchedule.start || state.preferences.workSchedule.end
  ));
  const hasValues = Boolean(state.preferences.workSchedule.start || state.preferences.workSchedule.end);
  const enabled = editing || hasValues;
  const invalid = Boolean(enabled && hasValues && !isWorkSchedule(state.preferences.workSchedule));
  // Only a problem needs words; the switch and the two fields explain the rest.
  const note = invalid ? t(locale, 'settings.workScheduleInvalid') : null;

  const toggle = () => {
    if (enabled) {
      actions.setWorkSchedule({ start: null, end: null });
      setEditing(false);
      return;
    }
    setEditing(true);
  };

  return (
    <>
      <div className="il-section-h"><span>{t(locale, 'settings.workday')}</span></div>
      <div className="il-settings-group">
        <ToggleSetting
          title={t(locale, 'settings.workSchedule')}
          note={note}
          value={enabled}
          onToggle={toggle}
          ariaLabel={t(locale, 'settings.workSchedule')}
        />
        {enabled && (
          <div className="il-settings-workhours-row">
            <div className="il-settings-workhours">
              <label>
                <span>{t(locale, 'settings.workStart')}</span>
                <input
                  type="time"
                  value={state.preferences.workSchedule.start ?? ''}
                  onChange={(event) => actions.setWorkSchedule({ ...state.preferences.workSchedule, start: event.target.value || null })}
                  aria-label={t(locale, 'settings.workStart')}
                />
              </label>
              <span className="sep">–</span>
              <label>
                <span>{t(locale, 'settings.workEnd')}</span>
                <input
                  type="time"
                  value={state.preferences.workSchedule.end ?? ''}
                  onChange={(event) => actions.setWorkSchedule({ ...state.preferences.workSchedule, end: event.target.value || null })}
                  aria-label={t(locale, 'settings.workEnd')}
                />
              </label>
            </div>
          </div>
        )}
        {enabled && <WorkDaysRow workDays={state.preferences.workDays} locale={locale} onChange={actions.setWorkDays} />}
      </div>
    </>
  );
}

// Monday first, as a work week reads.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function WorkDaysRow({ workDays, locale, onChange }) {
  const toggle = (day) => {
    onChange(workDays.includes(day) ? workDays.filter((item) => item !== day) : [...workDays, day]);
  };
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  // 2026-11-01 is a Sunday; day N of the week is that date + N.
  const label = (day) => weekday.format(new Date(2026, 10, 1 + day));
  return (
    <div className="il-settings-workdays" role="group" aria-label={t(locale, 'settings.workDays')}>
      {WEEK_ORDER.map((day) => (
        <button
          key={day}
          type="button"
          className={'il-settings-workday' + (workDays.includes(day) ? ' on' : '')}
          aria-pressed={workDays.includes(day)}
          onClick={() => toggle(day)}
        >
          {label(day)}
        </button>
      ))}
    </div>
  );
}
