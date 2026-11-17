import { useEffect, useId, useRef, useState } from 'react';
import Icons from '../../icons';
import { t } from '../../i18n';

export default function SheetShell({ title, onClose, children, footer, locale = 'ja-JP' }) {
  const sheetRef = useRef(null);
  const titleId = useId();
  const [previousFocus] = useState(() => document.activeElement);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (sheet && !sheet.contains(document.activeElement)) {
      const autoFocusTarget = sheet.querySelector('[autofocus]');
      const firstFocusable = sheet.querySelector(FOCUSABLE_SELECTOR);
      // The sheet starts off-screen (slide-in animation). A plain focus() would
      // scroll the clipped app container to reveal it, jerking the whole screen up.
      (autoFocusTarget ?? firstFocusable ?? sheet).focus({ preventScroll: true });
    }
    return () => previousFocus?.focus?.({ preventScroll: true });
  }, [previousFocus]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(sheetRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])];
    if (focusable.length === 0) {
      event.preventDefault();
      sheetRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div className="il-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="il-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="grab" />
        <div className="sheet-head">
          <div className="title" id={titleId}>{title}</div>
          <button type="button" className="il-iconbtn" onClick={onClose} aria-label={t(locale, 'sheets.close')}>{Icons.close(16)}</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>
  );
}

const FOCUSABLE_SELECTOR = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
