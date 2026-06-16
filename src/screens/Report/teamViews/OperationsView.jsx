import { useState } from 'react';
import { t } from '../../../i18n';
import { queuePriorityLabel } from './teamReportUtils';

export function OperationsView({ state, actions, locale }) {
  const workspace = state.teamWorkspace;
  const queue = workspace.interruptionQueue ?? [];
  const openQueue = queue.filter((item) => !item.done);
  const doneQueue = queue.filter((item) => item.done);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('later');

  return (
    <>
      <div className="il-card">
        <h3>{t(locale, 'team.rulesTitle')}</h3>
        <div className="il-report-exportcopy">{t(locale, 'team.rulesCopy')}</div>
      </div>

      <div className="il-card">
        <h3>{t(locale, 'team.questionMode')}</h3>
        <div className="il-seg full">
          {[
            ['open', t(locale, 'team.open')],
            ['ask-later', t(locale, 'team.askLater')],
            ['focus', t(locale, 'team.focusing')],
            ['break', t(locale, 'team.onBreak')],
          ].map(([value, label]) => (
            <button
              key={value}
              className={workspace.questionMode === value ? 'active' : ''}
              onClick={() => actions.updateTeamWorkspace({ questionMode: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="il-card">
        <h3>{t(locale, 'team.focusWindow')}</h3>
        <div className="il-ops-row">
          <input value={workspace.focusWindow.start} onChange={(event) => actions.updateTeamWorkspace({ focusWindow: { ...workspace.focusWindow, start: event.target.value } })} aria-label={t(locale, 'team.focusWindowStart')} />
          <span>-</span>
          <input value={workspace.focusWindow.end} onChange={(event) => actions.updateTeamWorkspace({ focusWindow: { ...workspace.focusWindow, end: event.target.value } })} aria-label={t(locale, 'team.focusWindowEnd')} />
        </div>
        <div className="il-report-exportcopy">{t(locale, 'team.focusWindowCopy')}</div>
      </div>

      <div className="il-card">
        <h3>{t(locale, 'team.queue')}</h3>
        <div className="il-queue-add">
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t(locale, 'team.subjectPlaceholder')} />
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="now">{t(locale, 'team.now')}</option>
            <option value="today">{t(locale, 'team.today')}</option>
            <option value="later">{t(locale, 'team.later')}</option>
          </select>
          <button className="btn secondary fill" onClick={() => {
            actions.addInterruptionQueueItem({ subject, priority });
            setSubject('');
          }}>{t(locale, 'team.add')}</button>
        </div>
        <div className="il-report-exportcopy">{t(locale, 'team.queueCopy')}</div>
        {openQueue.length === 0 ? (
          <div className="il-report-exportcopy">{t(locale, 'team.queueEmpty')}</div>
        ) : (
          <>
            <div className="il-team-queuehead">{t(locale, 'team.activeQueue')}</div>
            {openQueue.slice(-8).reverse().map((item) => (
              <QueueRow key={item.id} item={item} locale={locale} actions={actions} />
            ))}
          </>
        )}
        {doneQueue.length > 0 && (
          <>
            <div className="il-team-queuehead done">{t(locale, 'team.doneQueue')}</div>
            {doneQueue.slice(-4).reverse().map((item) => (
              <QueueRow key={item.id} item={item} locale={locale} actions={actions} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function QueueRow({ item, locale, actions }) {
  return (
    <div className="il-report-row il-team-queuerow">
      <div className="main">
        <div className="title">{item.subject}</div>
        <div className="sub">{queuePriorityLabel(item.priority, locale)}</div>
      </div>
      <div className="il-team-queueactions">
        <button className="btn sm secondary" onClick={() => actions.updateInterruptionQueueItem(item.id, { done: !item.done })}>
          {item.done ? t(locale, 'team.activeQueue') : t(locale, 'team.done')}
        </button>
        <button className="btn sm tert" onClick={() => actions.deleteInterruptionQueueItem(item.id)}>{t(locale, 'team.delete')}</button>
      </div>
    </div>
  );
}
