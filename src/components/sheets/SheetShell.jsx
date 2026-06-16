import Icons from '../../icons';
import { t } from '../../i18n';

export default function SheetShell({ title, onClose, children, footer, locale = 'ja-JP' }) {
  return (
    <>
      <div className="il-sheet-scrim" onClick={onClose} />
      <div className="il-sheet">
        <div className="grab" />
        <div className="sheet-head">
          <div className="title">{title}</div>
          <button className="il-iconbtn" onClick={onClose} aria-label={t(locale, 'sheets.close')}>{Icons.close(16)}</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>
  );
}
