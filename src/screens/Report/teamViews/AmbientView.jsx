import { t } from '../../../i18n';
import { PresencePill } from './TeamReportCommon';

export function AmbientView({ replay, presence, locale, actions }) {
  const frame = replay.frames[0] ?? { states: [] };
  const byMember = new Map(frame.states.map((item) => [item.memberId, item]));
  const counts = frame.states.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, { focus: 0, interrupt: 0, break: 0, idle: 0 });

  return (
    <>
      <div className="il-card il-ambient-card">
        <h3>{t(locale, 'team.ambientTitle')}</h3>
        <div className="il-ambient-field">
          {replay.members.length === 0 ? (
            <div className="il-ambient-empty">
              <div>{t(locale, 'team.ambientEmpty')}</div>
              <button className="btn secondary sm" onClick={() => actions.addTeamDemoArchive()}>{t(locale, 'team.loadDemo')}</button>
            </div>
          ) : replay.members.map((member, index) => {
            const item = byMember.get(member.id) ?? { status: 'idle', intensity: 0.2 };
            return (
              <div
                key={member.id}
                className={`il-ambient-light ${item.status}`}
                style={{
                  '--x': `${14 + (index * 29) % 72}%`,
                  '--y': `${18 + (index * 41) % 62}%`,
                  '--power': item.intensity,
                }}
                title={member.label}
              />
            );
          })}
        </div>
        <div className="il-ambient-legend">
          <span>{t(locale, 'team.focus')} {counts.focus ?? 0}</span>
          <span>{t(locale, 'team.interrupt')} {counts.interrupt ?? 0}</span>
          <span>{t(locale, 'team.break')} {counts.break ?? 0}</span>
          <span>{t(locale, 'team.idle')} {counts.idle ?? 0}</span>
        </div>
      </div>

      <div className="il-card">
        <h3>{t(locale, 'team.presenceTitle')}</h3>
        <div className="il-presence-preview">
          <PresencePill label="teamId" value={presence.teamId || t(locale, 'sheets.unset')} />
          <PresencePill label="anonymousMemberId" value={presence.anonymousMemberId} />
          <PresencePill label="status" value={presence.status} />
          <PresencePill label="intensity" value={presence.intensity.toFixed(2)} />
        </div>
        <div className="il-report-exportcopy">
          {t(locale, 'team.presenceCopy')}
        </div>
      </div>
    </>
  );
}
