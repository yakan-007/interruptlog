'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Event } from '@/types';
import { isBreakEvent } from '@/lib/utils';
import { type BreakFormState } from '@/hooks/useBreakModal';
import { useI18n } from '@/locales/client';

// BreakModalのPropsの型定義
interface BreakModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: BreakFormState;
  setFormState: React.Dispatch<React.SetStateAction<BreakFormState>>;
  onSubmit: () => void;
  onSave: () => void;
  onCancel: () => void;
  elapsedTime?: string;
  activeEvent?: Event;
}

const BreakModal: React.FC<BreakModalProps> = ({
  isOpen,
  onOpenChange,
  formState,
  setFormState,
  onSubmit,
  onSave,
  onCancel,
  elapsedTime,
  activeEvent,
}) => {
  const t = useI18n() as any;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('breakModal.title')}</DialogTitle>
          <DialogDescription>
            {isBreakEvent(activeEvent) ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {t('breakModal.elapsedTime', { elapsedTime })}
              </span>
            ) : (
              t('breakModal.description')
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="break-label"
            placeholder={t('breakModal.labelPlaceholder')}
            value={formState.label}
            onChange={(e) => setFormState({ ...formState, label: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          />
          {/* <Select value={formState.breakType} onValueChange={(value) => setFormState({ ...formState, breakType: value as Event['breakType'] })}> ... </Select> */}
          {/* {formState.breakType === 'custom' && <Input type="number" value={formState.breakDurationMinutes || ''} ... />} */}
        </div>
        {isBreakEvent(activeEvent) && (
          <p className="text-xs text-muted-foreground">
            {t('breakModal.cancelWarningPrefix')}
            <strong>{elapsedTime}</strong>
            {t('breakModal.cancelWarningSuffix')}
          </p>
        )}
        <DialogFooter>
          <Button type="button" onClick={onSubmit} variant="destructive">
            {t('breakModal.saveAndResume')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="mx-2" onClick={onSave}>
            {t('breakModal.saveOnly')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('breakModal.discardAndResume')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BreakModal; 