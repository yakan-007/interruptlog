import Icons from '../../../icons';
import { fmtDurationMin } from '../../../lib/formatters';
import { t, tx } from '../../../i18n';
import { EmptyTeamCard, TeamStat } from './TeamReportCommon';
import { formatTemplateDue } from './teamReportUtils';

export function DistributionView({ state, actions, onCreateTemplate, onEditTemplate, onImportTaskPack, locale = 'ja-JP' }) {
  const templates = [...(state.taskTemplates ?? [])].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const totalPlannedMinutes = templates.reduce((sum, template) => sum + (template.planning?.plannedDurationMinutes ?? 0), 0);

  return (
    <>
      <div className="il-card">
        <h3>{t(locale, 'team.distributionTasks')}</h3>
        <div className="il-report-taskstats">
          <TeamStat label={t(locale, 'team.taskCount')} value={tx(locale, 'common.count', templates.length)} />
          <TeamStat label={t(locale, 'team.plannedTotal')} value={fmtDurationMin(totalPlannedMinutes)} />
          <TeamStat label={t(locale, 'team.taxonomyVersion')} value={state.teamWorkspace.taxonomyVersion || '-'} />
        </div>
        <div className="il-report-exportcopy">
          {t(locale, 'team.distributionCopy')}
        </div>
      </div>

      <div className="il-card">
        <h3>{t(locale, 'team.distributionActions')}</h3>
        <div className="il-team-actiongrid">
          <button className="btn primary fill" onClick={onCreateTemplate}>{Icons.plus(14)} {t(locale, 'team.addTemplate')}</button>
          <button className="btn secondary fill" onClick={() => actions.exportTaskPack()} disabled={templates.length === 0}>{Icons.download(14)} {t(locale, 'team.exportTaskPack')}</button>
          <button className="btn secondary fill" onClick={onImportTaskPack}>{t(locale, 'team.importTaskPack')}</button>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyTeamCard title={t(locale, 'team.noTemplatesTitle')} copy={t(locale, 'team.noTemplatesCopy')} />
      ) : (
        <div className="il-card">
          <h3>{t(locale, 'team.templateList')}</h3>
          {templates.map((template, index) => (
            <button
              key={template.id}
              className="il-team-templatebutton"
              onClick={() => onEditTemplate(template)}
              style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}
            >
              <span
                className="il-settings-catdot"
                style={{ background: state.categories.find((category) => category.id === template.categoryId)?.color }}
              />
              <span className="main">
                <span className="title">{template.name}</span>
                <span className="sub">
                  {state.categories.find((category) => category.id === template.categoryId)?.name ?? t(locale, 'team.uncategorized')}
                  {' · '}
                  {fmtDurationMin(template.planning?.plannedDurationMinutes ?? 0)}
                  {' · '}
                  {formatTemplateDue(template.planning?.dueAt, locale)}
                </span>
              </span>
              <span className="meta">{Icons.chevR(14)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
