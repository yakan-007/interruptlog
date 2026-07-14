export function formatResolutionEventWindow(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = sameDay ? formatTime(start) : formatMonthDayTime(start);
  const endLabel = sameDay ? formatTime(end) : formatMonthDayTime(end);
  return `${startLabel} - ${endLabel}`;
}

function formatTime(date) {
  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}:${padTime(date.getSeconds())}`;
}

function formatMonthDayTime(date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}

function padTime(value) {
  return String(value).padStart(2, '0');
}
