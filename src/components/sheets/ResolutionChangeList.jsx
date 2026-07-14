import { t, typeLabel } from '../../i18n';
import { formatResolutionEventWindow } from './resolutionPresentation';

export default function ResolutionChangeList({ changes, locale, overwriteRemoval = false }) {
  return (
    <div className="il-resolution-list">
      {changes.map((change) => (
        <div key={`${change.sourceEventId}-${change.action}`} className="il-resolution-card">
          <div className="top">
            <span className={`il-chip ${change.action === 'remove' ? 'danger' : 'accent'}`}>
              {changeLabel(locale, change.action, overwriteRemoval)}
            </span>
            <span className="event">{change.before?.label ?? firstAfterLabel(change.after) ?? typeLabel(locale, 'unknown')}</span>
          </div>
          <ChangePreview before={change.before} after={change.after} locale={locale} />
        </div>
      ))}
    </div>
  );
}

function ChangePreview({ before, after, locale }) {
  return (
    <div className="il-resolution-compare">
      <div className="side before">
        <div className="label">{t(locale, 'sheets.before')}</div>
        {before ? <div className="line">{formatEventLine(before)}</div> : <div className="line muted">{t(locale, 'sheets.added')}</div>}
      </div>
      <div className="arrow" aria-hidden="true">→</div>
      <div className="side after">
        <div className="label">{t(locale, 'sheets.after')}{afterCount(after) > 1 ? ` · ${afterCount(after)}` : ''}</div>
        {renderAfter(after, locale)}
      </div>
    </div>
  );
}

function renderAfter(after, locale) {
  if (!after) return <div className="line muted">{t(locale, 'sheets.removed')}</div>;
  if (Array.isArray(after)) {
    return after.map((item) => (
      <div key={item.id} className="line">{formatEventLine(item)}</div>
    ));
  }
  return <div className="line">{formatEventLine(after)}</div>;
}

function afterCount(after) {
  if (!after) return 0;
  return Array.isArray(after) ? after.length : 1;
}

function firstAfterLabel(after) {
  if (Array.isArray(after)) return after[0]?.label ?? null;
  return after?.label ?? null;
}

function formatEventLine(event) {
  return `${formatResolutionEventWindow(event)}  ${event.label}`;
}

function changeLabel(locale, action, overwriteRemoval) {
  if (action === 'remove' && overwriteRemoval) return t(locale, 'sheets.changeRemoveOverwrite');
  const path = `sheets.changeActions.${action}`;
  const label = t(locale, path);
  return label === path ? action : label;
}
