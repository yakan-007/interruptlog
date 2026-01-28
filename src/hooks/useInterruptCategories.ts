import { useMemo } from 'react';
import type { InterruptCategorySettings } from '@/types';
import { INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';
import { useInterruptCategorySettings } from '@/hooks/useStoreSelectors';

const CATEGORY_ORDER: Array<keyof InterruptCategorySettings> = [
  'category1',
  'category2',
  'category3',
  'category4',
  'category5',
  'category6',
];

export interface InterruptCategoryOption {
  id: keyof InterruptCategorySettings;
  name: string;
  color: string;
}

export default function useInterruptCategories() {
  const settings = useInterruptCategorySettings();

  const categories = useMemo(
    () =>
      CATEGORY_ORDER.map(id => ({
        id,
        name: settings[id],
        color: INTERRUPT_CATEGORY_COLORS[id],
      })),
    [settings]
  );

  return {
    categories,
    defaultCategoryName: categories[0]?.name ?? '',
  } as const;
}
