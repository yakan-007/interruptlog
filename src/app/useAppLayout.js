import { useEffect, useRef } from 'react';

export function useAppLayout(containerRef, preferences) {
  const stableViewportHeightRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const theme = preferences.dark ? 'dark' : 'light';
    containerRef.current.setAttribute('data-theme', theme);
    containerRef.current.style.setProperty('--accent', preferences.accent);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent', preferences.accent);

    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.removeProperty('--accent');
    };
  }, [containerRef, preferences.accent, preferences.dark]);

  useEffect(() => {
    const activeElementWantsKeyboard = () => {
      const element = document.activeElement;
      return element instanceof HTMLElement
        && (element.matches('input, textarea, select') || element.isContentEditable);
    };

    const updateKeyboardInset = () => {
      const root = containerRef.current;
      const viewport = window.visualViewport;
      const visualHeight = viewport?.height ?? window.innerHeight;
      const visualOffsetTop = viewport?.offsetTop ?? 0;

      if (!stableViewportHeightRef.current) {
        stableViewportHeightRef.current = window.innerHeight;
      }

      const rawInset = Math.max(
        0,
        stableViewportHeightRef.current - visualHeight - visualOffsetTop
      );
      const wantsKeyboard = activeElementWantsKeyboard();
      const keyboardOpen = wantsKeyboard && rawInset > 80;

      if (!wantsKeyboard) {
        stableViewportHeightRef.current = window.innerHeight;
      }

      const stableHeight = stableViewportHeightRef.current;
      const inset = keyboardOpen
        ? Math.max(0, stableHeight - visualHeight - visualOffsetTop)
        : 0;

      root?.style.setProperty('--app-height', `${Math.round(stableHeight)}px`);
      root?.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
      root?.toggleAttribute('data-keyboard-open', keyboardOpen);
    };

    const updateKeyboardInsetAfterFocus = () => {
      updateKeyboardInset();
      window.requestAnimationFrame?.(updateKeyboardInset);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('resize', updateKeyboardInset);
    window.addEventListener('focusin', updateKeyboardInsetAfterFocus);
    window.addEventListener('focusout', updateKeyboardInsetAfterFocus);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('resize', updateKeyboardInset);
      window.removeEventListener('focusin', updateKeyboardInsetAfterFocus);
      window.removeEventListener('focusout', updateKeyboardInsetAfterFocus);
    };
  }, [containerRef]);
}
