import SheetShell from './SheetShell';
import { t, tx, typeLabel } from '../../i18n';
import ResolutionChangeList from './ResolutionChangeList';
import { formatResolutionEventWindow } from './resolutionPresentation';

export default function ResolveEventSheet({ resolution, locale = 'ja-JP', onBack, onConfirm }) {
  const { preview, confirmLabel = t(locale, 'sheets.save') } = resolution;

  return (
    <SheetShell
      title={t(locale, 'sheets.overlapTitle')}
      onClose={onBack}
      locale={locale}
      footer={(
        <>
          <button className="btn tert" onClick={onBack}>{t(locale, 'sheets.back')}</button>
          <button className="btn primary" onClick={() => onConfirm(resolution)}>{confirmLabel}</button>
        </>
      )}
    >

      <div className="il-resolution-focus">
        <div className="eyebrow">{t(locale, 'sheets.eventToSave')}</div>
        <div className="title">{preview.candidate.label}</div>
        <div className="meta">
          <span>{typeLabel(locale, preview.candidate.type)}</span>
          <span>{formatResolutionEventWindow(preview.candidate)}</span>
        </div>
      </div>

      <div className="il-resolution-summary">
        <span className="il-chip warn">{tx(locale, 'sheets.overlapCount', preview.conflicts.length)}</span>
        <span className="il-chip">{tx(locale, 'sheets.changeCount', preview.changes.length)}</span>
      </div>

      <ResolutionChangeList changes={preview.changes} locale={locale} overwriteRemoval />
    </SheetShell>
  );
}
