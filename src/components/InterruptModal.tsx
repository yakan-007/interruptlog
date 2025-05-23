'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InterruptFormState } from '@/hooks/useInterruptModal';
import useSettingsStore from '@/store/useSettingsStore';
import { useI18n } from '@/locales/client';
import useMasterStore from '@/store/useMasterStore';
import { formatElapsedTime, toI18nKey } from '@/lib/utils';
import MasterDataInput from './MasterDataInput';
import InterruptTypeSelector from './InterruptTypeSelector';

export type InterruptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: InterruptFormState;
  setForm: (s: InterruptFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSave: () => void;
  startTime?: number;
};

export default function InterruptModal({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  onCancel,
  onSave,
  startTime,
}: InterruptModalProps) {
  const t = useI18n() as any;
  const { interruptTypes } = useSettingsStore((s) => s);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const { persons, organizations } = useMasterStore();

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (open && startTime) {
      const updateTimer = () => {
        setElapsedTime(formatElapsedTime(startTime));
      };
      updateTimer();
      timerId = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [open, startTime]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('InterruptModal.title')}</DialogTitle>
          <DialogDescription>
            {startTime ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {t('InterruptModal.elapsedTimeLabel')}: {elapsedTime}
              </span>
            ) : (
              t('InterruptModal.description')
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="interrupt-label"
            placeholder={t('InterruptModal.labelPlaceholder')}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Textarea
            id="interrupt-notes"
            placeholder={t('InterruptModal.notesPlaceholder')}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
          <MasterDataInput
            label={t('InterruptModal.whoPlaceholder')}
            idPrefix="interrupt-who"
            items={persons}
            selectedValue={form.who}
            onValueChange={(value) => setForm({ ...form, who: value })}
            selectPlaceholder={t('InterruptModal.selectPlaceholder')}
            inputPlaceholder={t('InterruptModal.directInputPlaceholder')}
          />
          <MasterDataInput
            label={t('InterruptModal.organizationPlaceholder')}
            idPrefix="interrupt-organization"
            items={organizations}
            selectedValue={form.organization}
            onValueChange={(value) => setForm({ ...form, organization: value })}
            selectPlaceholder={t('InterruptModal.selectPlaceholder')}
            inputPlaceholder={t('InterruptModal.directInputPlaceholder')}
          />
          <InterruptTypeSelector
            interruptTypes={interruptTypes}
            selectedType={form.interruptType}
            onTypeSelect={(typeLabel) => setForm({ ...form, interruptType: typeLabel })}
            t={t}
          />
          <div>
            <Label htmlFor="urgency-select" className="text-sm font-medium">
              {t('InterruptModal.urgencyLabel')}
            </Label>
            <Select
              value={form.urgency}
              onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                setForm({ ...form, urgency: value })
              }
            >
              <SelectTrigger id="urgency-select" className="w-full mt-1">
                <SelectValue placeholder={t('InterruptModal.urgencyPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">{t('InterruptModal.urgencyLow')}</SelectItem>
                <SelectItem value="Medium">{t('InterruptModal.urgencyMedium')}</SelectItem>
                <SelectItem value="High">{t('InterruptModal.urgencyHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onSubmit} variant="destructive">
            {t('InterruptModal.saveAndResumeButton')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="mx-2" onClick={onSave}>
            {t('InterruptModal.saveButton')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('InterruptModal.cancelButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 