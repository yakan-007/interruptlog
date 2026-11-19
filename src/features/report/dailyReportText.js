import { formatDate, formatDurationShort, normalizeLocale, tx } from '../../i18n';

const NOTE_INDENT = '　└ ';

/**
 * Plain text for pasting into chat, mail or a company report form. Headings
 * use 【】 and ■ and items use ・ so it reads the same where Markdown is not
 * rendered. Empty sections are left out.
 */
export function formatDailyReportText(report, locale = 'ja-JP') {
  const text = (key, args) => tx(locale, `report.dailyText.${key}`, args);
  const duration = (ms) => formatDurationShort(ms, locale);
  const ja = normalizeLocale(locale) === 'ja-JP';
  const paren = (value) => (ja ? `（${value}）` : ` (${value})`);
  const withCategory = (name, detail) => (detail && detail !== name ? `${name}${paren(detail)}` : name);
  const lines = [
    [`【${text('title')}】`, formatHeaderDate(report.date, locale), report.profile.affiliation, report.profile.name]
      .filter(Boolean)
      .join(' '),
    [
      report.span ? formatSpan(report.span, locale) : '',
      text('totals', {
        recorded: duration(report.totals.recorded),
        focus: duration(report.totals.focus),
        interruptCount: report.totals.interruptCount,
        interrupt: duration(report.totals.interrupt),
        rest: duration(report.totals.break),
      }),
    ].filter(Boolean).join(' ／ '),
  ];

  const taskLine = (row, done) => {
    const parts = [withCategory(row.name, row.categoryName)];
    if (row.dayTime > 0) parts[0] += ` ${duration(row.dayTime)}`;
    if (row.plannedMs > 0) {
      const estimate = text(done ? 'estimateDone' : 'estimateOpen', { planned: duration(row.plannedMs), actual: duration(row.totalTime) });
      parts.push(row.overMs > 0 || done ? `${estimate}${paren(signed(row.overMs, duration))}` : estimate);
    } else if (!done && row.totalTime > row.dayTime) {
      parts.push(text('cumulative', duration(row.totalTime)));
    }
    const due = formatDue(row, text, locale);
    if (due) parts.push(due);
    return [`・${parts.join(' ／ ')}`, ...notes(row.notes)];
  };

  section(lines, text('completed'), report.completed.flatMap((row) => taskLine(row, true)));
  section(lines, text('inProgress'), report.inProgress.flatMap((row) => taskLine(row, false)));
  section(lines, text('recordOnly'), report.recordOnly.flatMap((row) => [
    `・${withCategory(row.name, row.categoryName)} ${duration(row.time)}`,
    ...notes(row.notes),
  ]));

  const { interruptions } = report;
  if (interruptions.count > 0) {
    const senderParts = interruptions.senders.map((sender) => text('sender', { ...sender, time: duration(sender.time) }));
    if (interruptions.otherSenders?.count > 0) senderParts.push(others(interruptions.otherSenders, text, duration));
    section(lines, text('interruptions', { count: interruptions.count, time: duration(interruptions.time) }), [
      ...(interruptions.senders.length > 0 ? [`・${senderParts.join(' ／ ')}`] : []),
      ...interruptions.items.flatMap((item) => [
        `・${withCategory(item.label, item.who)} ${duration(item.time)}`,
        ...notes(item.memo ? [item.memo] : []),
      ]),
      ...(interruptions.otherItems.count > 0 ? [`・${others(interruptions.otherItems, text, duration)}`] : []),
    ]);
  }

  section(lines, text('remaining'), report.remaining.map((row) => {
    const due = formatDue(row, text, locale);
    return `・${[withCategory(row.name, row.categoryName), due].filter(Boolean).join(' ／ ')}`;
  }));

  return lines.join('\n');
}

function section(lines, title, body) {
  if (body.length === 0) return;
  lines.push('', `■ ${title}`, ...body);
}

function notes(list) {
  return list.map((note) => `${NOTE_INDENT}${note.replace(/\s*\n\s*/g, ' ')}`);
}

function others(summary, text, duration) {
  return text('others', { count: summary.count, time: duration(summary.time) });
}

function signed(ms, duration) {
  if (ms > 0) return `+${duration(ms)}`;
  if (ms < 0) return `-${duration(-ms)}`;
  return '±0m';
}

function formatDue(row, text, locale) {
  if (row.dueAt == null) return '';
  if (row.dueStatus === 'today') return text('dueToday');
  const due = text('due', formatDate(row.dueAt, locale));
  return row.dueStatus === 'overdue' || row.dueStatus === 'late' ? `${due} ${text('overdue')}` : due;
}

function formatHeaderDate(timestamp, locale) {
  const normalized = normalizeLocale(locale);
  const ymd = new Intl.DateTimeFormat(normalized, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(timestamp));
  const weekday = new Intl.DateTimeFormat(normalized, { weekday: 'short' }).format(new Date(timestamp));
  return tx(locale, 'report.dailyText.date', { ymd, weekday });
}

function formatSpan(span, locale) {
  const normalized = normalizeLocale(locale);
  const clock = new Intl.DateTimeFormat(normalized, { hour: 'numeric', minute: '2-digit' });
  const dash = normalized === 'ja-JP' ? '〜' : '–';
  return `${clock.format(new Date(span.start))}${dash}${clock.format(new Date(span.end))}`;
}
