import { useMemo, useRef, useState } from 'react';
import { FEATURES } from '../../features';
import {
  aggregateArchiveRows,
  aggregateTeamReportRows,
  buildAmbientReplay,
  buildPublicPresence,
  compareArchivePeriods,
  parseReportCsvFiles,
} from '../../state';
import {
  AmbientView,
  ArchiveView,
  CompareView,
  DistributionView,
  ImportView,
  OperationsView,
} from './TeamReportViews';
import { PayloadImportSheet, TaskTemplateSheet } from '../Settings/TeamPanels';
import { t } from '../../i18n';

const EMPTY_ARCHIVE_ENTRIES = [];

export default function TeamReport({ state, actions }) {
  const [view, setView] = useState(() => FEATURES.teamLights && state.preferences.teamLightsEnabled ? 'ambient' : 'import');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ files: 0, skipped: 0 });
  const [error, setError] = useState('');
  const [panel, setPanel] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [archiveGrain, setArchiveGrain] = useState('month');
  const [compareGrain, setCompareGrain] = useState('month');
  const inputRef = useRef(null);

  const summary = useMemo(() => aggregateTeamReportRows(rows), [rows]);
  const archiveEntries = state.teamArchive?.entries ?? EMPTY_ARCHIVE_ENTRIES;
  const archivePeriods = useMemo(() => aggregateArchiveRows(archiveEntries, archiveGrain), [archiveEntries, archiveGrain]);
  const comparison = useMemo(() => compareArchivePeriods(archiveEntries, compareGrain), [archiveEntries, compareGrain]);
  const replay = useMemo(() => buildAmbientReplay(rows.length ? rows : archiveEntries), [archiveEntries, rows]);
  const presence = useMemo(() => buildPublicPresence(state), [state]);
  const locale = state.preferences.locale;
  const lightsAvailable = FEATURES.teamLights && state.preferences.teamLightsEnabled;
  const activeView = !lightsAvailable && view === 'ambient' ? 'import' : view;

  const importFiles = async (fileList) => {
    const csvFiles = Array.from(fileList ?? []).filter((file) => /\.csv$/i.test(file.name) || file.type.includes('csv'));
    if (csvFiles.length === 0) {
      setError(t(locale, 'team.chooseCsv'));
      return;
    }
    try {
      const payloads = await Promise.all(csvFiles.map(async (file) => ({ name: file.name, text: await file.text() })));
      const parsed = parseReportCsvFiles(payloads);
      setRows(parsed.rows);
      setMeta({ files: parsed.files, skipped: parsed.skipped });
      setSaveResult(null);
      setError('');
    } catch {
      setError(t(locale, 'team.csvError'));
    }
  };

  const saveToArchive = () => {
    const result = actions.addRowsToTeamArchive(rows);
    setSaveResult(result);
  };

  return (
    <>
      <div className="il-body il-body-report">
        <div className="il-report-submode">
          <div className="il-seg full">
            <button className={activeView === 'import' ? 'active' : ''} onClick={() => setView('import')}>{t(locale, 'team.import')}</button>
            {lightsAvailable && <button className={activeView === 'ambient' ? 'active' : ''} onClick={() => setView('ambient')}>{t(locale, 'team.ambient')}</button>}
            <button className={activeView === 'ops' ? 'active' : ''} onClick={() => setView('ops')}>{t(locale, 'team.ops')}</button>
            <button className={activeView === 'distribution' ? 'active' : ''} onClick={() => setView('distribution')}>{t(locale, 'team.distribution')}</button>
            <button className={activeView === 'archive' ? 'active' : ''} onClick={() => setView('archive')}>{t(locale, 'team.archive')}</button>
            <button className={activeView === 'compare' ? 'active' : ''} onClick={() => setView('compare')}>{t(locale, 'team.compare')}</button>
          </div>
        </div>

        {activeView === 'import' && (
          <ImportView
            rows={rows}
            meta={meta}
            error={error}
            summary={summary}
            saveResult={saveResult}
            inputRef={inputRef}
            onImportFiles={importFiles}
            onSaveToArchive={saveToArchive}
            locale={locale}
          />
        )}
        {lightsAvailable && activeView === 'ambient' && <AmbientView replay={replay} presence={presence} locale={locale} actions={actions} />}
        {activeView === 'ops' && <OperationsView state={state} actions={actions} locale={locale} />}
        {activeView === 'distribution' && (
          <DistributionView
            state={state}
            actions={actions}
            onCreateTemplate={() => setPanel({ type: 'taskTemplate' })}
            onEditTemplate={(template) => setPanel({ type: 'taskTemplate', template })}
            onImportTaskPack={() => setPanel({ type: 'taskPackImport' })}
            locale={locale}
          />
        )}
        {activeView === 'archive' && (
          <ArchiveView
            entries={archiveEntries}
            grain={archiveGrain}
            periods={archivePeriods}
            onGrainChange={setArchiveGrain}
            locale={locale}
          />
        )}
        {activeView === 'compare' && (
          <CompareView
            entries={archiveEntries}
            grain={compareGrain}
            comparison={comparison}
            onGrainChange={setCompareGrain}
            locale={locale}
          />
        )}
      </div>

      {panel?.type === 'taskPackImport' && (
        <PayloadImportSheet
          title={t(locale, 'team.taskPackImportTitle')}
          copy={t(locale, 'team.taskPackImportCopy')}
          label={t(locale, 'team.taskPackJson')}
          locale={locale}
          onClose={() => setPanel(null)}
          onImport={(payload) => {
            const result = actions.importTaskPack(payload);
            if (result.ok) setPanel(null);
            return result;
          }}
        />
      )}
      {panel?.type === 'taskTemplate' && (
        <TaskTemplateSheet
          template={panel.template}
          categories={state.categories}
          locale={state.preferences.locale}
          onClose={() => setPanel(null)}
          onSave={(template) => {
            const result = actions.saveTaskTemplate(template);
            if (result.ok) setPanel(null);
          }}
          onDelete={(id) => { actions.deleteTaskTemplate(id); setPanel(null); }}
        />
      )}
    </>
  );
}
