import { useCallback, useState } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Event } from '@/types';
import { DEFAULT_INTERRUPT_CATEGORIES } from '@/lib/constants';

export interface InterruptFormState {
  label: string;
  who: string;
  interruptType: Event['interruptType']; 
  urgency: Event['urgency'];
}

const DEFAULT_FORM: InterruptFormState = {
  label: '',
  who: '',
  interruptType: DEFAULT_INTERRUPT_CATEGORIES.category1, // デフォルトは最初のカテゴリ
  urgency: 'Medium',
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
  const { startInterrupt, updateInterruptDetails, stopInterruptAndResumePreviousTask, cancelCurrentInterruptAndResumeTask, stopCurrentEvent } = useEventsStore((s) => s.actions);
  const interruptCategorySettings = useEventsStore((s) => s.interruptCategorySettings);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InterruptFormState>(DEFAULT_FORM);

  // モーダルを開く。割り込み開始（プレースホルダーラベルで）
  const openInterruptModal = useCallback(() => {
    // Use first interrupt category as default
    setForm({
      ...DEFAULT_FORM,
      interruptType: interruptCategorySettings.category1
    });
    startInterrupt(); // デフォルトの「Interrupt」ラベルで開始
    setOpen(true);
  }, [startInterrupt, interruptCategorySettings.category1]);

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
    });
    stopCurrentEvent();
    setOpen(false);
  }, [updateInterruptDetails, form, stopCurrentEvent]);

  const handleCancelInterrupt = useCallback(() => {
    cancelCurrentInterruptAndResumeTask();
    setOpen(false);
  }, [cancelCurrentInterruptAndResumeTask]);

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