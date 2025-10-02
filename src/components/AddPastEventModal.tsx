'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import useEventsStore from '@/store/useEventsStore';
import type { Event, Category } from '@/types';

interface AddPastEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRange: { start: number; end: number };
}

const EVENT_LABELS: Record<Event['type'], string> = {
  task: 'タスク',
  interrupt: '割り込み',
  break: '休憩',
};

const BREAK_OPTIONS: Array<{ value: NonNullable<Event['breakType']>; label: string }> = [
  { value: 'short', label: 'ショート' },
  { value: 'coffee', label: 'コーヒー' },
  { value: 'lunch', label: 'ランチ' },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '未設定' },
];

const formatDateTimeLocal = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const clampTimestamp = (value: number): number => {
  const now = Date.now();
  return Math.min(value, now);
};

export default function AddPastEventModal({ open, onOpenChange, defaultRange }: AddPastEventModalProps) {
  const { events, actions, categories, isCategoryEnabled, interruptContacts, interruptSubjects } = useEventsStore(state => ({
    events: state.events,
    actions: state.actions,
    categories: state.categories,
    isCategoryEnabled: state.isCategoryEnabled,
    interruptContacts: state.interruptContacts,
    interruptSubjects: state.interruptSubjects,
  }));

  const [eventType, setEventType] = useState<Event['type']>('task');
  const [label, setLabel] = useState('');
  const [who, setWho] = useState('');
  const [interruptType, setInterruptType] = useState('');
  const [breakType, setBreakType] = useState<NonNullable<Event['breakType']>>('short');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedEvents = useMemo(() => events.slice().sort((a, b) => a.start - b.start), [events]);

  useEffect(() => {
    if (!open) return;

    const now = Date.now();
    const start = clampTimestamp(Math.min(defaultRange.start, defaultRange.end - 60_000));
    const tentativeEnd = clampTimestamp(defaultRange.end);
    const safeEnd = tentativeEnd > start ? tentativeEnd : Math.min(start + 30 * 60 * 1000, now);

    setEventType('task');
    setLabel('');
    setWho('');
    setInterruptType('');
    setBreakType('short');
    setCategoryId('none');
    setStartInput(formatDateTimeLocal(start));
    setEndInput(formatDateTimeLocal(safeEnd));
    setMemo('');
    setError(null);
    setSuccessMessage(null);
  }, [open, defaultRange]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const parseDateTime = (value: string): number | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.getTime();
  };

  const validateRange = (start: number, end: number): string | null => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return '開始・終了時刻を正しく入力してください。';
    }
    if (start >= end) {
      return '終了時刻は開始時刻より後の時刻を指定してください。';
    }
    if (end > Date.now()) {
      return '未来の時刻は指定できません。';
    }
    const overlaps = sortedEvents.filter(existing => {
      const existingEnd = existing.end ?? Date.now();
      return existingEnd > start && existing.start < end;
    });

    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      const startLabel = formatDateTimeLocal(conflict.start).replace('T', ' ');
      const endLabel = formatDateTimeLocal((conflict.end ?? Date.now())).replace('T', ' ');
      return `既存のイベント (${startLabel} - ${endLabel}) と重なっています。`; 
    }

    return null;
  };

  const handleSubmit = () => {
    try {
      setError(null);
      setSuccessMessage(null);

      const start = parseDateTime(startInput);
      const end = parseDateTime(endInput);

      if (start == null || end == null) {
        setError('開始・終了時刻を正しく入力してください。');
        return;
      }

      const validation = validateRange(start, end);
      if (validation) {
        setError(validation);
        return;
      }

      const baseEvent: Event = {
        id: uuidv4(),
        type: eventType,
        start,
        end,
      };

      const finalLabel = label.trim();

      if (eventType === 'task') {
        const finalCategory = categoryId === 'none' ? undefined : categoryId;
        actions.addEvent({
          ...baseEvent,
          label: finalLabel || undefined,
          categoryId: finalCategory,
          memo: memo.trim() || undefined,
        });
      } else if (eventType === 'interrupt') {
        const finalWho = who.trim();
        const finalType = interruptType.trim();
        actions.addEvent({
          ...baseEvent,
          label: finalLabel || undefined,
          who: finalWho || undefined,
          interruptType: finalType || undefined,
          memo: memo.trim() || undefined,
        });
        if (finalWho) {
          actions.addInterruptContact(finalWho);
        }
      } else {
        const durationMinutes = Math.round((end - start) / 60000);
        actions.addEvent({
          ...baseEvent,
          label: label.trim() || undefined,
          breakType,
          breakDurationMinutes: durationMinutes,
          memo: memo.trim() || undefined,
        });
      }

      setSuccessMessage('イベントを追加しました。');
      onOpenChange(false);
    } catch (err) {
      console.error('[AddPastEventModal] Failed to add event', err);
      setError('イベントの追加に失敗しました。もう一度お試しください。');
    }
  };

  const canSubmit = startInput.length > 0 && endInput.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>過去のイベントを追加</DialogTitle>
          <DialogDescription>
            押し忘れた時間帯を後から登録できます。時間が重複しないように注意してください。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>イベント種類</Label>
            <Select value={eventType} onValueChange={value => setEventType(value as Event['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">タスク</SelectItem>
                <SelectItem value="interrupt">割り込み</SelectItem>
                <SelectItem value="break">休憩</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start">開始時刻</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startInput}
              max={formatDateTimeLocal(Date.now())}
              onChange={event => setStartInput(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="end">終了時刻</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endInput}
              max={formatDateTimeLocal(Date.now())}
              onChange={event => setEndInput(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="label">表示名 (任意)</Label>
            <Input
              id="label"
              placeholder={`${EVENT_LABELS[eventType]}の内容`}
              value={label}
              onChange={event => setLabel(event.target.value)}
            />
            {eventType === 'interrupt' && interruptSubjects.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {interruptSubjects.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-amber-500/20"
                    onClick={() => {
                      setLabel(subject);
                    }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            )}
          </div>

          {eventType === 'task' && isCategoryEnabled && (
            <div className="grid gap-2">
              <Label>カテゴリ</Label>
              <Select value={categoryId} onValueChange={value => setCategoryId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">指定なし</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {eventType === 'interrupt' && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="who">発信者 (任意)</Label>
                <Input
                  id="who"
                  placeholder="だれからの割り込みか"
                  value={who}
                  onChange={event => setWho(event.target.value)}
                />
                {interruptContacts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interruptContacts.map(contact => (
                      <button
                        key={contact}
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                        onClick={() => setWho(contact)}
                      >
                        {contact}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interruptType">種類 (任意)</Label>
                <Input
                  id="interruptType"
                  placeholder="内容の種類"
                  value={interruptType}
                  onChange={event => setInterruptType(event.target.value)}
                />
              </div>
            </div>
          )}

          {eventType === 'break' && (
            <div className="grid gap-2">
              <Label>休憩タイプ</Label>
              <Select value={breakType} onValueChange={value => setBreakType(value as typeof breakType)}>
                <SelectTrigger>
                  <SelectValue placeholder="休憩タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {BREAK_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="memo">メモ (任意)</Label>
            <textarea
              id="memo"
              placeholder="補足があれば入力してください"
              value={memo}
              onChange={event => setMemo(event.target.value)}
              className="min-h-[96px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
