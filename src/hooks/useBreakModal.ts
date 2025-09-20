import { useCallback, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event } from '@/types';

export interface BreakFormState {
  label: string;
  breakType: Event['breakType'];
  breakDurationMinutes: number | null;
}

const DEFAULT_FORM: BreakFormState = {
  label: '',
  breakType: 'short',
  breakDurationMinutes: null,
};

export default function useBreakModal() {
  const { startBreak, updateEvent, stopBreakAndResumePreviousTask, stopCurrentEvent } = useEventsStore((s) => s.actions);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BreakFormState>(DEFAULT_FORM);

  // モーダルを開く。プレースホルダー休憩を開始
  const openBreakModal = useCallback(() => {
    setForm(DEFAULT_FORM);
    startBreak({
      label: DEFAULT_FORM.label || undefined,
      breakType: DEFAULT_FORM.breakType,
    });
    setOpen(true);
  }, [startBreak]);

  // フォーム確定して休憩終了→前タスク再開
  const handleSubmitBreak = useCallback(() => {
    const state = useEventsStore.getState();
    const currentBreak = state.events.find(e => e.id === state.currentEventId && e.type === 'break' && !e.end);
    if (currentBreak) {
      updateEvent({
        ...currentBreak,
        label: form.label.trim() || currentBreak.label,
        breakType: form.breakType,
        breakDurationMinutes: form.breakDurationMinutes,
      });
    }
    stopBreakAndResumePreviousTask();
    setOpen(false);
  }, [form, updateEvent, stopBreakAndResumePreviousTask]);

  // 保存のみ（タスク再開せず）
  const handleSaveBreak = useCallback(() => {
    const state = useEventsStore.getState();
    const currentBreak = state.events.find(e => e.id === state.currentEventId && e.type === 'break' && !e.end);
    if (currentBreak) {
      updateEvent({
        ...currentBreak,
        label: form.label.trim() || currentBreak.label,
        breakType: form.breakType,
        breakDurationMinutes: form.breakDurationMinutes,
      });
    }
    // イベントのみ終了
    stopCurrentEvent();
    setOpen(false);
  }, [form, updateEvent, stopCurrentEvent]);

  // モーダルキャンセル時も休憩終了→前タスク再開
  const handleCancelBreak = useCallback(() => {
    stopBreakAndResumePreviousTask();
    setOpen(false);
  }, [stopBreakAndResumePreviousTask]);

  return {
    isBreakModalOpen: open,
    breakFormState: form,
    setBreakFormState: setForm,
    openBreakModal,
    handleSubmitBreak,
    handleCancelBreak,
    handleSaveBreak,
  } as const;
}
