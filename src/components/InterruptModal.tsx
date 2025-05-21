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

const formatModalElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const t = useI18n();
  const { interruptTypes } = useSettingsStore((s) => s);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (open && startTime) {
      const updateTimer = () => {
        setElapsedTime(formatModalElapsedTime(startTime));
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

  const currentSelectedTypeLabel = form.interruptType || 'Other';

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
          <Input
            id="interrupt-who"
            placeholder={t('InterruptModal.whoPlaceholder')}
            value={form.who}
            onChange={(e) => setForm({ ...form, who: e.target.value })}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {interruptTypes.map((typeItem) => (
              <Button
                key={typeItem.id}
                variant={currentSelectedTypeLabel === typeItem.label ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, interruptType: typeItem.label })}
              >
                {typeItem.label}
              </Button>
            ))}
          </div>
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