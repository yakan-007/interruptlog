import Icons from '../../../icons';
import { t, tx } from '../../../i18n';
import { SummaryStats, TeamSummaryCards } from './TeamReportCommon';

export function ImportView({ rows, meta, error, summary, saveResult, inputRef, onImportFiles, onSaveToArchive, locale = 'ja-JP' }) {
  return (
    <>
      <div
        className="il-team-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onImportFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={(event) => onImportFiles(event.target.files)}
        />
        <button className="btn secondary fill" onClick={() => inputRef.current?.click()}>
          {Icons.download(14)} {t(locale, 'team.importCsv')}
        </button>
        <div className="copy">{t(locale, 'team.importCopy')}</div>
        {error && <div className="il-inline-error">{error}</div>}
        {meta.files > 0 && (
          <div className="il-team-importmeta">
            {tx(locale, 'team.files', meta.files)} · {tx(locale, 'common.rows', summary.rowCount)}
            {meta.skipped > 0 ? ` · ${tx(locale, 'team.skippedRows', meta.skipped)}` : ''}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <SummaryStats summary={summary} locale={locale} />
          <div className="il-report-export">
            <button className="btn primary fill" onClick={onSaveToArchive}>{Icons.check(14)} {t(locale, 'team.saveArchive')}</button>
            {saveResult && (
              <div className="il-report-exportcopy">
                {tx(locale, 'team.savedRows', saveResult.addedEntries)}
                {saveResult.skippedEntries > 0 ? ` · ${tx(locale, 'team.skippedInvalidRows', saveResult.skippedEntries)}` : ''}
              </div>
            )}
          </div>
          <TeamSummaryCards summary={summary} locale={locale} />
        </>
      )}
    </>
  );
}
