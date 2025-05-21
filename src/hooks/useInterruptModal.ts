import { useCallback, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event } from '@/types';

export interface InterruptFormState {
  label: string;
  who: string;
  interruptType: Event['interruptType']; 
  urgency: Event['urgency'];
  notes?: string;
}

const DEFAULT_FORM: InterruptFormState = {
  label: '',
  who: '',
  interruptType: 'Other',
  urgency: 'Medium',
  notes: '',
};

/**
 * useInterruptModal
 * モーダルの開閉状態とフォーム入力をカプセル化し、
 *   1) openInterrupt()
 *   2) closeInterrupt()
 *   3) submitInterrupt()
 * を呼び出すだけで割り込みワークフローを実現できる。
 */
export default function useInterruptModal() {
  const { startInterrupt, updateInterruptDetails, stopInterruptAndResumePreviousTask, cancelCurrentInterruptAndResumeTask, stopCurrentEvent, discardCurrentEventAndResumePreviousTask } = useEventsStore((s) => s.actions);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InterruptFormState>(DEFAULT_FORM);

  // モーダルを開く。プレースホルダー割り込みを開始
  const openInterruptModal = useCallback(() => {
    setForm(DEFAULT_FORM);
    startInterrupt();
    setOpen(true);
  }, [startInterrupt]);

  // モーダルを閉じるのみ（イベント再開などは行わない）
  const closeInterruptModal = useCallback(() => {
    setOpen(false);
  }, []);

  // フォーム確定して割り込み終了→前タスク再開
  const handleSubmitInterrupt = useCallback(() => {
    updateInterruptDetails({
      label: form.label.trim() || 'Interrupt',
      who: form.who.trim(),
      interruptType: form.interruptType,
      urgency: form.urgency,
      notes: form.notes?.trim(),
    });
    stopInterruptAndResumePreviousTask();
    setOpen(false);
  }, [updateInterruptDetails, stopInterruptAndResumePreviousTask, form]);

  // 保存のみ（タスク再開せず）
  const handleSaveInterrupt = useCallback(() => {
    updateInterruptDetails({
      label: form.label.trim() || 'Interrupt',
      who: form.who.trim(),
      interruptType: form.interruptType,
      urgency: form.urgency,
      notes: form.notes?.trim(),
    });
    stopCurrentEvent();
    setOpen(false);
  }, [updateInterruptDetails, form, stopCurrentEvent]);

  const handleCancelInterrupt = useCallback(() => {
    discardCurrentEventAndResumePreviousTask();
    setOpen(false);
  }, [discardCurrentEventAndResumePreviousTask]);

  return {
    isModalOpen: open,
    interruptFormState: form,
    setInterruptFormState: setForm,
    openInterruptModal,
    closeInterruptModal,
    handleSubmitInterrupt,
    handleCancelInterrupt,
    handleSaveInterrupt,
  } as const;
} 