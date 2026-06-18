import { useState } from 'react';
import Icons from '../../icons';
import { FEATURES } from '../../features';
import { SUPPORTED_LOCALES, t, tx } from '../../i18n';
import { useListReorderDrag } from '../../lib/useListReorderDrag';
import SettingRow from './SettingRow';
import { ACCENTS } from './constants';
import {
  CategorySheet,
  ChipsSheet,
  ConfirmResetSheet,
  ImportSheet,
  InterruptCategorySheet,
} from './PersonalPanels';
import { PayloadImportSheet } from './TeamPanels';
import {
  AddRowButton,
  CategoryRow,
  ExportRow,
  InterruptCategoryRow,
  NavRow,
  RepairWarningRow,
  SettingsNote,
  ToggleSetting,
} from './SettingsRows';

export default function SettingsScreen({ state, actions }) {
  const [panel, setPanel] = useState(null);
  const [reorderMode, setReorderMode] = useState(null);
  const teamModeEnabled = FEATURES.teamUi && state.preferences.teamModeEnabled;
  const locale = state.preferences.locale;
  const categoryReordering = reorderMode === 'categories';
  const interruptCategoryReordering = reorderMode === 'interruptCategories';
  const categoryReorder = useListReorderDrag({
    onMove: actions.moveCategoryToIndex,
  });
  const interruptCategoryReorder = useListReorderDrag({
    onMove: actions.moveInterruptCategoryToIndex,
  });

  return (
    <div className="il-screen il-fade">
      <div className="il-topbar">
        <div><div className="sub">{t(locale, 'settings.eyebrow')}</div><h1>{t(locale, 'settings.title')}</h1></div>
      </div>

      <div className="il-body il-body-settings">
        <div className="il-section-h"><span>{t(locale, 'settings.appearance')}</span></div>
        <div className="il-settings-group">
          <SettingRow title={t(locale, 'settings.language')} note={t(locale, 'settings.languageNote')}>
            <select
              className="il-settings-select"
              value={state.preferences.locale}
              onChange={(event) => actions.setLocale(event.target.value)}
              aria-label={t(locale, 'settings.language')}
            >
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale.code} value={locale.code}>{locale.label}</option>
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

        <div className="il-section-h"><span>{t(locale, 'settings.behavior')}</span></div>
        <div className="il-settings-group">
          <ToggleSetting title={t(locale, 'settings.topAdd')} value={state.preferences.topAdd} onToggle={() => actions.setTopAdd(!state.preferences.topAdd)} ariaLabel={t(locale, 'settings.topAdd')} />
          <ToggleSetting title={t(locale, 'settings.sortDue')} value={state.preferences.sortDue} onToggle={() => actions.setSortDue(!state.preferences.sortDue)} ariaLabel={t(locale, 'settings.sortDue')} />
        </div>

        <SettingsSectionHeader
          title={t(locale, 'settings.categories')}
          count={state.categories.length}
          locale={locale}
          reorderActive={categoryReordering}
          onToggleReorder={() => setReorderMode(categoryReordering ? null : 'categories')}
        />
        <div className="il-settings-group">
          {state.categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              locale={locale}
              onClick={() => setPanel({ type: 'category', category })}
              rowProps={categoryReordering ? categoryReorder.getRowProps(category.id, index) : undefined}
              dragHandleProps={categoryReordering ? categoryReorder.getHandleProps(category.id, index) : undefined}
              dragging={categoryReorder.drag?.id === category.id}
              dropPosition={categoryReordering ? categoryReorder.getDropPosition(category.id, index, state.categories.length) : null}
              reorderMode={categoryReordering}
            />
          ))}
          {!categoryReordering && <AddRowButton label={t(locale, 'settings.addCategory')} onClick={() => setPanel({ type: 'category' })} />}
        </div>

        <SettingsSectionHeader
          title={t(locale, 'settings.interruptCategories')}
          count={state.interruptCats.length}
          locale={locale}
          reorderActive={interruptCategoryReordering}
          onToggleReorder={() => setReorderMode(interruptCategoryReordering ? null : 'interruptCategories')}
        />
        <div className="il-settings-group">
          {state.interruptCats.map((category, index) => (
            <InterruptCategoryRow
              key={category.id}
              category={category}
              locale={locale}
              onClick={() => setPanel({ type: 'interruptCategory', category })}
              rowProps={interruptCategoryReordering ? interruptCategoryReorder.getRowProps(category.id, index) : undefined}
              dragHandleProps={interruptCategoryReordering ? interruptCategoryReorder.getHandleProps(category.id, index) : undefined}
              dragging={interruptCategoryReorder.drag?.id === category.id}
              dropPosition={interruptCategoryReordering ? interruptCategoryReorder.getDropPosition(category.id, index, state.interruptCats.length) : null}
              reorderMode={interruptCategoryReordering}
            />
          ))}
          {!interruptCategoryReordering && <AddRowButton label={t(locale, 'settings.addInterruptCategory')} onClick={() => setPanel({ type: 'interruptCategory' })} />}
        </div>

        <div className="il-section-h"><span>{t(locale, 'settings.frequentInputs')}</span></div>
        <div className="il-settings-group">
          <NavRow title={t(locale, 'settings.whoChips')} note={state.whoChips.length ? state.whoChips.join(' · ') : t(locale, 'settings.noSavedItems')} onClick={() => setPanel({ type: 'chips', kind: 'who' })} />
          <NavRow title={t(locale, 'settings.subjectChips')} note={tx(locale, 'common.count', state.subjectChips.length)} onClick={() => setPanel({ type: 'chips', kind: 'subject' })} />
        </div>

        {FEATURES.teamUi && (
          <>
            <div className="il-section-h"><span>{t(locale, 'settings.teamOps')}</span>{teamModeEnabled && <span className="count">{state.teamArchive.entries.length}</span>}</div>
            <div className="il-settings-group">
              <ToggleSetting title={t(locale, 'settings.teamMode')} note={teamModeEnabled ? t(locale, 'settings.teamModeOn') : t(locale, 'settings.teamModeOff')} value={teamModeEnabled} onToggle={() => actions.setTeamModeEnabled(!teamModeEnabled)} ariaLabel={t(locale, 'settings.teamMode')} />
              {teamModeEnabled && (
                <>
                  {FEATURES.teamLights && (
                    <ToggleSetting
                      title={t(locale, 'settings.teamLights')}
                      note={t(locale, 'settings.teamLightsNote')}
                      value={state.preferences.teamLightsEnabled}
                      onToggle={() => actions.setTeamLightsEnabled(!state.preferences.teamLightsEnabled)}
                      ariaLabel={t(locale, 'settings.teamLights')}
                    />
                  )}
                  <div className="il-setrow il-settings-member">
                    <span className="tg">
                      <span className="t">{t(locale, 'settings.memberName')}</span>
                      <span className="s">{t(locale, 'settings.memberNameNote')}</span>
                    </span>
                    <input
                      className="il-settings-memberinput"
                      value={state.preferences.memberName}
                      onChange={(event) => actions.setMemberName(event.target.value)}
                      placeholder={locale === 'ja-JP' ? '例: 佐藤' : 'Example: Alex'}
                      aria-label={t(locale, 'settings.memberName')}
                    />
                  </div>
                  <SettingsNote icon={Icons.report(14)} title={t(locale, 'settings.teamRulesTitle')} lines={tx(locale, 'settings.teamRulesLines', state.teamWorkspace.taxonomyVersion)} />
                  <ExportRow title={t(locale, 'settings.exportTeamSettings')} note={t(locale, 'settings.exportTeamSettingsNote')} onClick={() => actions.exportTeamSettings()} />
                  <NavRow title={t(locale, 'settings.importTeamSettings')} note={t(locale, 'settings.importTeamSettingsNote')} accent onClick={() => setPanel({ type: 'teamSettingsImport' })} />
                  <SettingsNote icon={Icons.tasks(14)} title={t(locale, 'settings.taskPackPlaceTitle')} lines={tx(locale, 'settings.taskPackPlaceLines')} />
                  <ExportRow title={t(locale, 'settings.exportTeamArchive')} note={t(locale, 'settings.exportTeamArchiveNote')} onClick={() => actions.exportTeamArchive()} />
                  <NavRow title={t(locale, 'settings.importTeamArchive')} note={t(locale, 'settings.importTeamArchiveNote')} accent onClick={() => setPanel({ type: 'teamArchiveImport' })} />
                </>
              )}
            </div>
          </>
        )}

        <div className="il-section-h"><span>{t(locale, 'settings.data')}</span></div>
        {state.overlapRepair.warning && (
          <div className="il-settings-group">
            <RepairWarningRow locale={locale} onRepair={() => actions.openOverlapRepair()} />
          </div>
        )}
        <div className="il-settings-group">
          <SettingsNote icon={Icons.alert(14)} title={t(locale, 'settings.storageTitle')} lines={tx(locale, 'settings.storageLines')} />
          <ExportRow title={t(locale, 'settings.exportBackup')} note={t(locale, 'settings.exportBackupNote')} onClick={() => actions.exportJson()} />
          <NavRow title={t(locale, 'settings.importBackup')} note={t(locale, 'settings.importBackupNote')} accent onClick={() => setPanel({ type: 'import' })} />
          <NavRow title={t(locale, 'settings.resetAll')} note={t(locale, 'settings.resetAllNote')} danger onClick={() => setPanel({ type: 'reset' })} />
        </div>

        <div className="il-settings-footnote">
          <div className="title">{t(locale, 'settings.webFootTitle')}</div>
          <div>{t(locale, 'settings.webFootSave')}</div>
          <div>{t(locale, 'settings.webFootBackup')}</div>
        </div>
      </div>

      {panel?.type === 'category' && (
        <CategorySheet
          category={panel.category}
          locale={locale}
          onClose={() => setPanel(null)}
          onSave={(category) => { actions.saveCategory(category); setPanel(null); }}
          onDelete={(id) => { actions.deleteCategory(id); setPanel(null); }}
        />
      )}
      {panel?.type === 'interruptCategory' && (
        <InterruptCategorySheet
          category={panel.category}
          locale={locale}
          onClose={() => setPanel(null)}
          onSave={(category) => { actions.saveInterruptCategory(category); setPanel(null); }}
          onDelete={(id) => { actions.deleteInterruptCategory(id); setPanel(null); }}
        />
      )}
      {panel?.type === 'chips' && (
        <ChipsSheet
          kind={panel.kind}
          chips={panel.kind === 'subject' ? state.subjectChips : state.whoChips}
          locale={locale}
          onClose={() => setPanel(null)}
          onSave={(chips) => { actions.saveChips(panel.kind, chips); setPanel(null); }}
        />
      )}
      {panel?.type === 'import' && (
        <ImportSheet
          locale={locale}
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importJson(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {FEATURES.teamUi && panel?.type === 'teamSettingsImport' && (
        <PayloadImportSheet
          title={t(locale, 'team.teamSettingsImportTitle')}
          copy={t(locale, 'team.teamSettingsImportCopy')}
          label={t(locale, 'team.teamSettingsJson')}
          locale={locale}
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTeamSettings(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {FEATURES.teamUi && panel?.type === 'teamArchiveImport' && (
        <PayloadImportSheet
          title={t(locale, 'team.teamArchiveImportTitle')}
          copy={t(locale, 'team.teamArchiveImportCopy')}
          label={t(locale, 'team.teamArchiveJson')}
          locale={locale}
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTeamArchive(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'reset' && (
        <ConfirmResetSheet
          locale={locale}
          onClose={() => setPanel(null)}
          onConfirm={() => { actions.resetAll(); setPanel(null); }}
        />
      )}
    </div>
  );
}

function SettingsSectionHeader({ title, count, locale, reorderActive, onToggleReorder }) {
  return (
    <div className="il-section-h il-settings-section-h">
      <span>{title}</span>
      <span className="il-settings-section-actions">
        <span className="count">{count}</span>
        {count > 1 && (
          <button
            type="button"
            className={'il-settings-reorder-toggle' + (reorderActive ? ' active' : '')}
            onClick={onToggleReorder}
          >
            {reorderActive ? t(locale, 'settings.reorderDone') : t(locale, 'settings.reorder')}
          </button>
        )}
      </span>
    </div>
  );
}
