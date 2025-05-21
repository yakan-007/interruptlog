import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { InterruptFormState } from '@/hooks/useInterruptModal';

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

const interruptTypes = ['Meeting', 'Call', 'Q&A', 'Visit', 'Chat', 'Other'];

const formatModalElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function InterruptModal({ open, onOpenChange, form, setForm, onSubmit, onCancel, onSave, startTime }: InterruptModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>中断中 / On Interrupt</DialogTitle>
          <DialogDescription>
            {startTime ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                経過時間: {elapsedTime}
              </span>
            ) : (
              '割り込みの詳細を入力してください。'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="interrupt-label"
            placeholder="割り込みの件名 (例: XX社からの電話対応)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            id="interrupt-who"
            placeholder="割り込んだ人・要因 (例: 佐藤部長, Outlook通知)"
            value={form.who}
            onChange={(e) => setForm({ ...form, who: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            {interruptTypes.map((type) => (
              <Button
                key={type}
                variant={form.interruptType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, interruptType: type })}
              >
                {type}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="urgency-select" className="text-sm font-medium">
              Urgency
            </Label>
            <Select
              value={form.urgency}
              onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                setForm({ ...form, urgency: value })
              }
            >
              <SelectTrigger id="urgency-select" className="w-full mt-1">
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onSubmit} variant="destructive">
            保存して再開 / Save & Resume
          </Button>
          <Button type="button" variant="outline" size="sm" className="mx-2" onClick={onSave}>
            保存 / Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            キャンセル / Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 