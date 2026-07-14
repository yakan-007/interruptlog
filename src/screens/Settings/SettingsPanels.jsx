import {
  CategorySheet,
  ChipsSheet,
  ConfirmResetSheet,
  ImportSheet,
  InterruptCategorySheet,
  ReportProfileSheet,
} from './PersonalPanels';

export default function SettingsPanels({ panel, state, actions, locale, onClose }) {
  const reportProfile = state.preferences.reportProfile ?? { affiliation: '', name: '' };

  if (panel?.type === 'category') {
    return (
      <CategorySheet
        category={panel.category}
        locale={locale}
        onClose={onClose}
        onSave={(category) => { actions.saveCategory(category); onClose(); }}
        onDelete={(id) => { actions.deleteCategory(id); onClose(); }}
      />
    );
  }

  if (panel?.type === 'interruptCategory') {
    return (
      <InterruptCategorySheet
        category={panel.category}
        locale={locale}
        onClose={onClose}
        onSave={(category) => { actions.saveInterruptCategory(category); onClose(); }}
        onDelete={(id) => { actions.deleteInterruptCategory(id); onClose(); }}
      />
    );
  }

  if (panel?.type === 'chips') {
    return (
      <ChipsSheet
        kind={panel.kind}
        chips={panel.kind === 'subject' ? state.subjectChips : state.whoChips}
        locale={locale}
        onClose={onClose}
        onSave={(chips) => { actions.saveChips(panel.kind, chips); onClose(); }}
      />
    );
  }

  if (panel?.type === 'reportProfile') {
    return (
      <ReportProfileSheet
        profile={reportProfile}
        locale={locale}
        onClose={onClose}
        onSave={(profile) => { actions.setReportProfile(profile); onClose(); }}
      />
    );
  }

  if (panel?.type === 'import') {
    return (
      <ImportSheet
        locale={locale}
        onClose={onClose}
        onImport={(payload) => {
          const result = actions.importJson(payload);
          if (result.ok) onClose();
          return result;
        }}
      />
    );
  }

  if (panel?.type === 'reset') {
    return (
      <ConfirmResetSheet
        locale={locale}
        onClose={onClose}
        onConfirm={() => { actions.resetAll(); onClose(); }}
      />
    );
  }

  return null;
}
