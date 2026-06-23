import { fmtDurationShort } from '../../../lib/formatters';
import { categoryLabel, formatDate, t, tx } from '../../../i18n';
import TaskStat from '../TaskStat';

export function CategoryTimeCard({ categories, categoryList, totalCategoryTime, locale = 'ja-JP' }) {
  if (categoryList.length === 0) return null;

  return (
    <div className="il-card">
      <h3>{t(locale, 'report.categoryTime')}</h3>
      {categoryList.map((category, index) => {
        const categoryInfo = categories.find((item) => item.id === category.id);
        const percent = Math.round((category.time / totalCategoryTime) * 100);
        return (
          <div key={category.id} className="il-report-categoryrow" style={{ borderTop: index > 0 ? '0.5px solid var(--hair)' : 'none' }}>
            <div className="header">
              <span className="name">
                <span className="swatch" style={{ background: categoryInfo?.color }} />
                {categoryInfo ? categoryLabel(locale, categoryInfo) : category.id}
              </span>
              <span className="il-mono value">{fmtDurationShort(category.time, locale)} <span className="muted">· {percent}%</span></span>
            </div>
            <div className="bar">
              <div style={{ width: `${percent}%`, background: categoryInfo?.color, opacity: 0.85 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TaskStatusCard({
  completedInRange,
  completedTasks,
  incompleteTasks,
  taskRate,
  taskReportRows,
  uniqueTaskIds,
  locale = 'ja-JP',
}) {
  return (
    <div className="il-card">
      <h3>{t(locale, 'report.taskStatus')}</h3>
      <div className="il-report-taskstats">
        <TaskStat label={t(locale, 'report.taskCount')} value={uniqueTaskIds.length} />
        <TaskStat label={t(locale, 'report.completed')} value={completedInRange} />
        <TaskStat label={t(locale, 'report.incomplete')} value={uniqueTaskIds.length - completedInRange} />
        <TaskStat label={t(locale, 'report.completionRate')} value={`${taskRate}%`} accent />
      </div>
      {taskReportRows.length > 0 && (
        <div className="il-report-tasklists">
          <TaskReportList title={t(locale, 'report.completedTasks')} empty={t(locale, 'report.noCompletedTasks')} tasks={completedTasks} locale={locale} />
          <TaskReportList title={t(locale, 'report.incompleteTasks')} empty={t(locale, 'report.noIncompleteTasks')} tasks={incompleteTasks} locale={locale} />
        </div>
      )}
    </div>
  );
}

function TaskReportList({ title, empty, tasks, locale = 'ja-JP' }) {
  return (
    <div className="il-report-tasklist">
      <div className="il-report-tasklist-title">
        <span>{title}</span>
        <span className="count">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="il-report-taskempty">{empty}</div>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="il-report-taskrow">
            <span className="swatch" style={{ background: task.categoryColor }} />
            <div className="main">
              <div className="name">{task.name}</div>
              <div className="meta">
                {task.categoryName && <span>{task.categoryName}</span>}
                <span>{fmtDurationShort(task.time, locale)}</span>
                {task.completedInRange && task.completedAt && <span>{tx(locale, 'report.completedAt', formatReportTaskDate(task.completedAt, locale))}</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatReportTaskDate(timestamp, locale) {
  return formatDate(timestamp, locale);
}
