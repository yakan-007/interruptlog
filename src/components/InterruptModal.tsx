import { useState, useEffect } from 'react';
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

import { formatElapsedTime } from '@/lib/timeUtils';
import { TIMER_UPDATE_INTERVAL_MS, INTERRUPT_CATEGORY_COLORS } from '@/lib/constants';
import useEventsStore from '@/store/useEventsStore';


export default function InterruptModal({ open, onOpenChange, form, setForm, onSubmit, onCancel, onSave, startTime }: InterruptModalProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const interruptCategorySettings = useEventsStore((state) => state.interruptCategorySettings);
  
  const interruptCategories = [
    { id: 'category1', name: interruptCategorySettings.category1, color: INTERRUPT_CATEGORY_COLORS.category1 },
    { id: 'category2', name: interruptCategorySettings.category2, color: INTERRUPT_CATEGORY_COLORS.category2 },
    { id: 'category3', name: interruptCategorySettings.category3, color: INTERRUPT_CATEGORY_COLORS.category3 },
    { id: 'category4', name: interruptCategorySettings.category4, color: INTERRUPT_CATEGORY_COLORS.category4 },
    { id: 'category5', name: interruptCategorySettings.category5, color: INTERRUPT_CATEGORY_COLORS.category5 },
    { id: 'category6', name: interruptCategorySettings.category6, color: INTERRUPT_CATEGORY_COLORS.category6 },
  ];

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
          <Input
            id="interrupt-who"
            placeholder="誰が/何が割り込んだか（例：佐藤部長、Outlook通知）"
            value={form.who}
            onChange={(e) => setForm({ ...form, who: e.target.value })}
          />
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
          <div>
            <Label htmlFor="urgency-select" className="text-sm font-medium">
              緊急度
            </Label>
            <Select
              value={form.urgency}
              onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                setForm({ ...form, urgency: value })
              }
            >
              <SelectTrigger id="urgency-select" className="w-full mt-1">
                <SelectValue placeholder="緊急度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">低</SelectItem>
                <SelectItem value="Medium">中</SelectItem>
                <SelectItem value="High">高</SelectItem>
              </SelectContent>
            </Select>
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