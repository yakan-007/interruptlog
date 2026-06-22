const pad = (value) => String(value).padStart(2, '0');

export function toDateTimeLocalValue(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}
