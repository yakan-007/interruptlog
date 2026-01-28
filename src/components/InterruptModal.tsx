import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

import { formatElapsedTime } from '@/lib/timeUtils';
import { TIMER_UPDATE_INTERVAL_MS } from '@/lib/constants';
import useEventsStore from '@/store/useEventsStore';
import useInterruptCategories from '@/hooks/useInterruptCategories';


export default function InterruptModal({ open, onOpenChange, form, setForm, onSubmit, onCancel, onSave, startTime }: InterruptModalProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const { interruptContacts, interruptSubjects } = useEventsStore(state => ({
    interruptContacts: state.interruptContacts,
    interruptSubjects: state.interruptSubjects,
  }));
  const { categories: interruptCategories } = useInterruptCategories();
  
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (open && startTime) {
      const updateTimer = () => {
        setElapsedTime(formatElapsedTime(startTime));
      };
      updateTimer();
      timerId = setInterval(updateTimer, TIMER_UPDATE_INTERVAL_MS);
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
          <DialogTitle>割り込み作業対応中</DialogTitle>
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
            placeholder="割り込みの件名（例：XX会社からの電話）"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          {interruptSubjects.length > 0 && (
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
              {interruptSubjects.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-amber-500/20"
                    onClick={() => setForm({ ...form, label: subject })}
                  >
                    {subject}
                  </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Input
              id="interrupt-who"
              placeholder="誰が/何が割り込んだか（例：佐藤部長、Outlook通知）"
              value={form.who}
              onChange={(e) => setForm({ ...form, who: e.target.value })}
            />
            {interruptContacts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interruptContacts.map(contact => (
                  <button
                    key={contact}
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                    onClick={() => setForm({ ...form, who: contact })}
                  >
                    {contact}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-300">割り込みカテゴリ</Label>
            <div className="grid grid-cols-3 gap-2">
              {interruptCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={form.interruptType === category.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm({ ...form, interruptType: category.name })}
                  style={{
                    backgroundColor: form.interruptType === category.name ? category.color : undefined,
                    borderColor: form.interruptType === category.name ? category.color : undefined,
                  }}
                  className={form.interruptType === category.name ? 'text-white hover:opacity-90' : ''}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={onSubmit} variant="destructive" className="flex-1">
            <Play className="mr-1.5 h-4 w-4" />
            保存して再開
          </Button>
          <Button type="button" onClick={onSave} variant="outline" className="flex-1">
            <Zap className="mr-1.5 h-4 w-4" />
            保存して終了
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
