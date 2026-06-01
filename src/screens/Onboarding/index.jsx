import Icons from '../../icons';

const FEATURES = [
  {
    icon: Icons.bolt,
    color: 'var(--interrupt)',
    title: 'ワンタップで割り込みを記録',
    subtitle: '電話・チャット・質問を正確にログ',
  },
  {
    icon: Icons.clock,
    color: 'var(--task)',
    title: '押し忘れもあとから編集OK',
    subtitle: '履歴の時間は自由に直せます',
  },
  {
    icon: Icons.report,
    color: 'oklch(0.5 0.12 280)',
    title: '時間の行方が見える',
    subtitle: '集中・割り込み・休憩・未分類を可視化',
  },
];

export default function OnboardingScreen({ actions }) {
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

        <div className="il-onboarding-eyebrow">割り込みログ</div>
        <h1>InterruptLog</h1>
        <p className="il-onboarding-copy">
          仕事は割り込みで分断される。<br />
          その現実を前提にした、<br />
          正確な作業時間トラッカー。
        </p>

        <div className="il-onboarding-features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="il-onboarding-feature">
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
                  <div className="title">{feature.title}</div>
                  <div className="subtitle">{feature.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="il-onboarding-storage">
          <div className="title">この Web 版について</div>
          <div className="copy">
            データはこのブラウザに保存されます。別端末には自動同期されません。
            <br />
            大事なログは、あとで設定から JSON バックアップしておけます。
          </div>
        </div>
      </div>

      <div className="il-onboarding-footer">
        <button className="btn primary fill il-onboarding-cta" onClick={() => actions.finishOnboarding()}>
          はじめる
        </button>
        <div className="il-onboarding-note">このブラウザに保存・アカウント不要</div>
      </div>
    </div>
  );
}
