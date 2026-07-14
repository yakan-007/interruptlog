import { useState } from 'react';
import { t } from '../../i18n';
import CategorySections from './CategorySections';
import PersonalDataSections from './PersonalDataSections';
import PreferenceSections from './PreferenceSections';
import SettingsPanels from './SettingsPanels';

export default function SettingsScreen({ state, actions }) {
  const [panel, setPanel] = useState(null);
  const [mountedAt] = useState(() => Date.now());
  const locale = state.preferences.locale;

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><div className="sub">{t(locale, 'settings.eyebrow')}</div><h1>{t(locale, 'settings.title')}</h1></div>
      </div>

      <div className="il-body il-body-settings">
        <PreferenceSections state={state} actions={actions} locale={locale} />
        <CategorySections state={state} actions={actions} locale={locale} onOpenPanel={setPanel} />
        <PersonalDataSections state={state} actions={actions} locale={locale} onOpenPanel={setPanel} now={mountedAt} />
      </div>

      <SettingsPanels
        panel={panel}
        state={state}
        actions={actions}
        locale={locale}
        onClose={() => setPanel(null)}
      />
    </div>
  );
}
