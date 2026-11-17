// Time ranges read as in History: "09:30 – 09:50", with seconds only for
// records shorter than a minute.
export function formatResolutionEventWindow(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const showSeconds = end.getTime() - start.getTime() < 60000;
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = sameDay ? formatTime(start, showSeconds) : formatMonthDayTime(start, showSeconds);
  const endLabel = sameDay ? formatTime(end, showSeconds) : formatMonthDayTime(end, showSeconds);
  return `${startLabel} – ${endLabel}`;
}

function formatTime(date, showSeconds) {
  const clock = `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
  return showSeconds ? `${clock}:${padTime(date.getSeconds())}` : clock;
}

function formatMonthDayTime(date, showSeconds) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date, showSeconds)}`;
}

function padTime(value) {
  return String(value).padStart(2, '0');
}
