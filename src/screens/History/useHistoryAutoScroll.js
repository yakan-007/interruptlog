import { useEffect, useRef } from 'react';

export default function useHistoryAutoScroll({ bodyRef, stickyRef, timelineRef, timeline, viewMode, isTodaySelected, selectedDate }) {
  const autoScrolledKeyRef = useRef(null);
  const autoScrollKey = viewMode === 'timeline' && isTodaySelected && timeline.nowY != null
    ? `${viewMode}:${selectedDate}`
    : null;

  useEffect(() => {
    if (!autoScrollKey) {
      autoScrolledKeyRef.current = null;
      return;
    }
    if (autoScrolledKeyRef.current === autoScrollKey) return;

    const body = bodyRef.current;
    const sticky = stickyRef.current;
    const timelineEl = timelineRef.current;
    if (!body || !timelineEl) return;
    autoScrolledKeyRef.current = autoScrollKey;

    let frameA = 0;
    let frameB = 0;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        if (timeline.nowY == null) return;
        const stickyHeight = sticky?.offsetHeight ?? 0;
        const bodyRect = body.getBoundingClientRect();
        const timelineRect = timelineEl.getBoundingClientRect();
        const timelineTop = timelineRect.top - bodyRect.top + body.scrollTop;
        const availableHeight = Math.max(160, body.clientHeight - stickyHeight);
        const preferredOffset = Math.max(72, availableHeight * 0.38);
        const target = timelineTop + timeline.nowY - stickyHeight - preferredOffset;
        const maxScroll = Math.max(0, body.scrollHeight - body.clientHeight);
        body.scrollTo({
          top: Math.max(0, Math.min(target, maxScroll)),
          behavior: 'auto',
        });
      });
    });

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, [autoScrollKey, bodyRef, stickyRef, timelineRef, timeline.nowY]);
}
