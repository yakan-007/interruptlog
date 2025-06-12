import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { InterruptFormState } from '@/hooks/useInterruptModal';
import { Play, Zap } from 'lucide-react';

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
  console.log('[InterruptModal] Component function called');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  console.log('[InterruptModal] Rendering with open props:', open, 'and startTime props:', startTime);

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
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>On Interrupt</DialogTitle>
          <DialogDescription>
            {startTime ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Elapsed: {elapsedTime}
              </span>
            ) : (
              'Please enter interrupt details.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="interrupt-label"
            placeholder="Interrupt subject (e.g., Phone call from XX Company)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            id="interrupt-who"
            placeholder="Who/What interrupted (e.g., Manager Sato, Outlook notification)"
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
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={onSubmit} variant="destructive" className="flex-1">
            <Play className="mr-1.5 h-4 w-4" />
            Save & Resume
          </Button>
          <Button type="button" onClick={onSave} variant="outline" className="flex-1">
            <Zap className="mr-1.5 h-4 w-4" />
            Save & End
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 