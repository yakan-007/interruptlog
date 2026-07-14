import Icons from '../../icons';
import { t, tx } from '../../i18n';
import ResolutionChangeList from './ResolutionChangeList';
import SheetShell from './SheetShell';

export default function RepairOverlapsSheet({ preview, locale = 'ja-JP', onDefer, onApply }) {
  return (
    <SheetShell
      title={t(locale, 'sheets.repairTitle')}
      onClose={onDefer}
      locale={locale}
      footer={(
        <>
          <button className="btn tert" onClick={onDefer}>{t(locale, 'sheets.repairLater')}</button>
          <button className="btn primary" onClick={onApply}>{Icons.spark(14)} {t(locale, 'sheets.repairApply')}</button>
        </>
      )}
    >
      <div className="il-sheet-copy">
        {t(locale, 'sheets.repairCopy')}
      </div>

      <div className="il-resolution-summary">
        <span className="il-chip warn">{tx(locale, 'sheets.overlapCount', preview.conflicts.length)}</span>
        <span className="il-chip">{tx(locale, 'sheets.changeCount', preview.changes.length)}</span>
      </div>

      <ResolutionChangeList changes={preview.changes} locale={locale} />
    </SheetShell>
  );
}
