import { useEffect, useState } from 'react';

const tickerListeners = new Set();

export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handleSync = (nextNow) => setNow(nextNow);
    tickerListeners.add(handleSync);
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      tickerListeners.delete(handleSync);
      clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}

export function resyncTickersNow(now = Date.now()) {
  tickerListeners.forEach((listener) => listener(now));
}
