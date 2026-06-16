import Icons from '../../icons';
import { t, tx } from '../../i18n';

const FEATURES = [
  {
    icon: Icons.bolt,
    color: 'var(--interrupt)',
    key: 'interrupt',
  },
  {
    icon: Icons.clock,
    color: 'var(--task)',
    key: 'edit',
  },
  {
    icon: Icons.report,
    color: 'oklch(0.5 0.12 280)',
    key: 'review',
  },
];

export default function OnboardingScreen({ actions, locale = 'ja-JP' }) {
  const hero = tx(locale, 'onboarding.hero');
  const storageCopy = tx(locale, 'onboarding.storageCopy');

  return (
    <div className="il-screen il-onboarding il-fade">
      <div className="il-onboarding-main">
        <div className="il-onboarding-mark" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
            <path d="M18 8v10l6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M29 5l-6 8h4l-1 6 6-8h-4l1-6z" fill="currentColor" transform="translate(-3 0)" />
          </svg>
        </div>

        <div className="il-onboarding-eyebrow">{t(locale, 'onboarding.eyebrow')}</div>
        <h1>InterruptLog</h1>
        <p className="il-onboarding-copy">
          {hero.map((line) => <span key={line}>{line}<br /></span>)}
        </p>

        <div className="il-onboarding-features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const copy = tx(locale, `onboarding.features.${feature.key}`);
            return (
              <div key={feature.key} className="il-onboarding-feature">
                <div
                  className="il-onboarding-featureicon"
                  style={{
                    background: `color-mix(in oklch, ${feature.color} 12%, var(--bg-elevated))`,
                    color: feature.color,
                  }}
                  aria-hidden="true"
                >
                  {Icon(15)}
                </div>
                <div className="il-onboarding-featurecopy">
                  <div className="title">{copy.title}</div>
                  <div className="subtitle">{copy.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="il-onboarding-storage">
          <div className="title">{t(locale, 'onboarding.storageTitle')}</div>
          <div className="copy">
            {storageCopy.map((line) => <span key={line}>{line}<br /></span>)}
          </div>
        </div>
      </div>

      <div className="il-onboarding-footer">
        <button className="btn primary fill il-onboarding-cta" onClick={() => actions.finishOnboarding()}>
          {t(locale, 'onboarding.start')}
        </button>
        <div className="il-onboarding-note">{t(locale, 'onboarding.note')}</div>
      </div>
    </div>
  );
}
