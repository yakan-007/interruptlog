'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { toI18nKey } from '@/lib/utils';

interface InterruptType {
  id: string;
  label: string;
}

interface InterruptTypeSelectorProps {
  interruptTypes: InterruptType[];
  selectedType: string | undefined;
  onTypeSelect: (typeLabel: string) => void;
  t: (key: string) => string; // t関数をpropsとして受け取る
}

const InterruptTypeSelector: React.FC<InterruptTypeSelectorProps> = ({
  interruptTypes,
  selectedType,
  onTypeSelect,
  t,
}) => {
  const currentSelectedTypeLabel = selectedType || 'Other';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {interruptTypes.map((typeItem) => {
        const i18nKey = `InterruptType.${toI18nKey(typeItem.label)}`;
        let displayLabel: string | undefined;
        try {
          displayLabel = t(i18nKey);
        } catch {
          displayLabel = undefined;
        }
        return (
          <Button
            key={typeItem.id}
            variant={currentSelectedTypeLabel === typeItem.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeSelect(typeItem.label)}
          >
            {displayLabel && displayLabel !== i18nKey ? displayLabel : typeItem.label}
          </Button>
        );
      })}
    </div>
  );
};

export default InterruptTypeSelector; 