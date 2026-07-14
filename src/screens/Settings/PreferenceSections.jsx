import { useState } from 'react';
import { SUPPORTED_LOCALES, t } from '../../i18n';
import { isWorkSchedule } from '../../lib/workday';
import SettingRow from './SettingRow';
import { ToggleSetting } from './SettingsRows';
import { ACCENTS } from './constants';

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
        <SettingRow title={t(locale, 'settings.language')} note={t(locale, 'settings.languageNote')}>
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
        <ToggleSetting title={t(locale, 'settings.darkMode')} note={t(locale, 'settings.darkModeNote')} value={state.preferences.dark} onToggle={() => actions.setDark(!state.preferences.dark)} ariaLabel={t(locale, 'settings.darkMode')} />
        <SettingRow title={t(locale, 'settings.accent')}>
          <div className="il-settings-accents">
            {ACCENTS.map((color) => (
              <button
                key={color}
                aria-label={t(locale, 'settings.accent')}
                onClick={() => actions.setAccent(color)}
                className="il-settings-accent"
                data-selected={state.preferences.accent === color}
                style={{ background: color }}
              />
            ))}
          </div>
        </SettingRow>
      </div>
    </>
  );
}

function BehaviorSection({ state, actions, locale }) {
  return (
    <>
      <div className="il-section-h"><span>{t(locale, 'settings.behavior')}</span></div>
      <div className="il-settings-group">
        <ToggleSetting title={t(locale, 'settings.topAdd')} value={state.preferences.topAdd} onToggle={() => actions.setTopAdd(!state.preferences.topAdd)} ariaLabel={t(locale, 'settings.topAdd')} />
        <ToggleSetting title={t(locale, 'settings.sortDue')} value={state.preferences.sortDue} onToggle={() => actions.setSortDue(!state.preferences.sortDue)} ariaLabel={t(locale, 'settings.sortDue')} />
      </div>
    </>
  );
}

function WorkdaySection({ state, actions, locale }) {
  const [editing, setEditing] = useState(() => Boolean(
    state.preferences.workSchedule.start || state.preferences.workSchedule.end
  ));
  const hasValues = Boolean(state.preferences.workSchedule.start || state.preferences.workSchedule.end);
  const enabled = editing || hasValues;
  const invalid = Boolean(enabled && hasValues && !isWorkSchedule(state.preferences.workSchedule));
  const note = !enabled
    ? t(locale, 'settings.workScheduleOffNote')
    : !hasValues
      ? t(locale, 'settings.workScheduleSetupNote')
      : invalid
        ? t(locale, 'settings.workScheduleInvalid')
        : t(locale, 'settings.workScheduleNote');

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
      </div>
    </>
  );
}
