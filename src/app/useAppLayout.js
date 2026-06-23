import { useEffect } from 'react';

export function useAppLayout(containerRef, preferences) {
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.setAttribute('data-theme', preferences.dark ? 'dark' : 'light');
    containerRef.current.style.setProperty('--accent', preferences.accent);
  }, [containerRef, preferences.accent, preferences.dark]);

  useEffect(() => {
    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      const inset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      containerRef.current?.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('resize', updateKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('resize', updateKeyboardInset);
    };
  }, [containerRef]);
}
