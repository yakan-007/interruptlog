import Icons from '../../icons';
import { t, tx } from '../../i18n';

// How the app is used, in the order a first day goes. The icons and their
// colors are the ones the buttons use, so the screen after this looks familiar.
const STEPS = [
  { key: 'task', icon: () => Icons.play(13), tone: 'task' },
  { key: 'interrupt', icon: () => Icons.bolt(15), tone: 'interrupt' },
  { key: 'break', icon: () => Icons.coffee(15), tone: 'break' },
  { key: 'fix', icon: () => Icons.history(16), tone: 'neutral' },
];

export default function OnboardingScreen({ actions, locale = 'ja-JP' }) {
  const hero = tx(locale, 'onboarding.hero');

  return (
    <div className="il-screen il-onboarding il-fade">
      <div className="il-onboarding-main">
        <div className="il-onboarding-mark" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="17" cy="18" r="12" strokeWidth="2" opacity="0.35" />
            <path d="M14 3h6" strokeWidth="2" />
            <path d="M18.5 10.5l-5 7.5h4l-1 6 5-7.5h-4l1-6z" strokeWidth="1.8" />
          </svg>
        </div>

        <h1>InterruptLog</h1>
        <p className="il-onboarding-copy">
          {hero.map((line) => <span key={line}>{line}<br /></span>)}
        </p>

        <ol className="il-onboarding-steps">
          {STEPS.map((step) => {
            const copy = tx(locale, `onboarding.steps.${step.key}`);
            return (
              <li key={step.key} className="il-onboarding-step">
                <span className={`il-onboarding-stepicon ${step.tone}`} aria-hidden="true">{step.icon()}</span>
                <span className="il-onboarding-stepcopy">{copy}</span>
              </li>
            );
          })}
        </ol>

        <p className="il-onboarding-storage">{t(locale, 'onboarding.storage')}</p>
      </div>

      <div className="il-onboarding-footer">
        <button className="btn primary fill il-onboarding-cta" onClick={() => actions.finishOnboarding()}>
          {t(locale, 'onboarding.start')}
        </button>
      </div>
    </div>
  );
}
