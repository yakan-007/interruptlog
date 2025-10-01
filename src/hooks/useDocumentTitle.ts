import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.title = title;
  }, [title]);
}

export default useDocumentTitle;
