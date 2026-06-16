import { t } from '../../i18n';

export default function HistoryHeader({ locale }) {
  return (
    <div className="il-topbar">
      <div>
        <div className="sub">{t(locale, 'history.eyebrow')}</div>
        <h1>{t(locale, 'history.title')}</h1>
      </div>
    </div>
  );
}
