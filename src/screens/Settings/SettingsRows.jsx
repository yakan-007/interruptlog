import Icons from '../../icons';
import { categoryLabel, interruptCategoryLabel, t } from '../../i18n';
import SettingRow from './SettingRow';

export function ToggleSetting({ title, note, value, onToggle, ariaLabel }) {
  return (
    <SettingRow title={title} note={note}>
      <button className={'il-toggle' + (value ? ' on' : '')} onClick={onToggle} aria-label={ariaLabel} />
    </SettingRow>
  );
}

export function CategoryRow({ category, locale, onClick, rowProps, dragHandleProps, dragging = false, dropPosition = null, reorderMode = false }) {
  const content = (
    <>
      <span className="il-settings-catdot" style={{ background: category.color }} />
      <span className="tg"><span className="t">{categoryLabel(locale, category)}</span></span>
    </>
  );
  return (
    <div className={getReorderRowClass(dragging, dropPosition, reorderMode)} {...rowProps}>
      {reorderMode && (
        <button className="il-reorder-handle" aria-label={t(locale, 'settings.reorder')} {...dragHandleProps}>
          {Icons.grip(15)}
        </button>
      )}
      {reorderMode ? (
        <div className="il-setrow-main il-setrow-main-static">{content}</div>
      ) : (
        <button className="il-setbutton il-setrow-main" onClick={onClick}>
          {content}
          {Icons.chevR(14)}
        </button>
      )}
    </div>
  );
}

export function InterruptCategoryRow({ category, locale, onClick, rowProps, dragHandleProps, dragging = false, dropPosition = null, reorderMode = false }) {
  const content = (
    <>
      <span className={'il-settings-pauseicon ' + category.kind}>{category.kind === 'break' ? Icons.coffee(14) : Icons.bolt(14)}</span>
      <span className="tg">
        <span className="t">{interruptCategoryLabel(locale, category)}</span>
        <span className="s">{category.kind === 'break' ? t(locale, 'sheets.pauseKindBreak') : t(locale, 'sheets.pauseKindInterrupt')}</span>
      </span>
    </>
  );
  return (
    <div className={getReorderRowClass(dragging, dropPosition, reorderMode)} {...rowProps}>
      {reorderMode && (
        <button className="il-reorder-handle" aria-label={t(locale, 'settings.reorder')} {...dragHandleProps}>
          {Icons.grip(15)}
        </button>
      )}
      {reorderMode ? (
        <div className="il-setrow-main il-setrow-main-static">{content}</div>
      ) : (
        <button className="il-setbutton il-setrow-main" onClick={onClick}>
          {content}
          {Icons.chevR(14)}
        </button>
      )}
    </div>
  );
}

function getReorderRowClass(dragging, dropPosition, reorderMode) {
  return [
    'il-setrow il-settings-reorderrow',
    reorderMode ? 'is-reordering' : '',
    dragging ? 'dragging' : '',
    dropPosition ? `drop-${dropPosition}` : '',
  ].filter(Boolean).join(' ');
}

export function AddRowButton({ label, onClick }) {
  return (
    <button className="il-setrow il-setbutton accent" onClick={onClick}>
      <span className="tg"><span className="t">{Icons.plus(14)} {label}</span></span>
    </button>
  );
}

export function NavRow({ title, note, accent = false, danger = false, onClick }) {
  const titleClass = danger ? 'danger-inline' : accent ? 'accent-inline' : undefined;
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="tg"><span className={titleClass ? `t ${titleClass}` : 't'}>{title}</span><span className="s">{note}</span></span>
      {Icons.chevR(14)}
    </button>
  );
}

export function ExportRow({ title, note, onClick }) {
  return (
    <button className="il-setrow il-setbutton" onClick={onClick}>
      <span className="tg"><span className="t accent-inline">{Icons.download(14)} {title}</span><span className="s">{note}</span></span>
    </button>
  );
}

export function SettingsNote({ icon, title, lines }) {
  return (
    <div className="il-setrow il-settings-note">
      <span className="il-settings-noteicon" aria-hidden="true">{icon}</span>
      <span className="tg">
        <div className="t">{title}</div>
        {lines.map((line) => <div key={line} className="s">{line}</div>)}
      </span>
    </div>
  );
}

export function RepairWarningRow({ locale, onRepair }) {
  return (
    <div className="il-setrow">
      <span className="tg">
        <span className="t danger-inline">{Icons.alert(14)} {t(locale, 'settings.repairTitle')}</span>
        <span className="s">{t(locale, 'settings.repairCopy')}</span>
      </span>
      <button className="btn secondary sm" onClick={onRepair}>{t(locale, 'settings.repairAction')}</button>
    </div>
  );
}
