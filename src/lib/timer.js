const pad = (value) => String(value).padStart(2, '0');

export function elapsedSince(start, now = Date.now()) {
  const startValue = Number(start);
  const nowValue = Number(now);
  if (!Number.isFinite(startValue) || !Number.isFinite(nowValue)) return 0;
  return Math.max(0, nowValue - startValue);
}

export function formatElapsedClock(milliseconds) {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
