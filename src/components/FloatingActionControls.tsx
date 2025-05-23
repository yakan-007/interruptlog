'use client';

import React from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Square, Zap, Coffee, Play } from 'lucide-react';
import { Event } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import useInterruptModal from '@/hooks/useInterruptModal';
import useBreakModal from '@/hooks/useBreakModal';
import InterruptModal from '@/components/InterruptModal';
import BreakModal from '@/components/BreakModal';
import { formatElapsedTime, isTaskEvent, isInterruptEvent, isBreakEvent } from '@/lib/utils';
import { breakOptions } from '@/config/breakOptions';
import useActiveTimer from '@/hooks/useActiveTimer';
import { useI18n } from '@/locales/client';
import { floatingControls, iconSizes, typography, colors } from '@/styles/tailwind-classes';

export default function FloatingActionControls() {
  const t = useI18n() as any;
  // --- ストア・状態管理 ---
  const { actions } = useEventsStore();
  const { activeEvent, elapsedTime } = useActiveTimer();

  // 休憩モーダル用カスタムフック
  const {
    isBreakModalOpen,
    breakFormState,
    setBreakFormState,
    openBreakModal,
    handleSubmitBreak,
    handleCancelBreak,
    handleSaveBreak,
  } = useBreakModal();

  // 割り込みモーダル用カスタムフック
  const {
    isModalOpen,
    interruptFormState,
    setInterruptFormState,
    openInterruptModal,
    closeInterruptModal,
    handleSubmitInterrupt,
    handleCancelInterrupt,
    handleSaveInterrupt,
  } = useInterruptModal();

  // --- イベント操作 ---
  const handleStop = () => {
    // モーダルが開いていれば閉じる
    if (isModalOpen) {
      closeInterruptModal();
    }
    // イベント種類ごとに停止処理を分岐
    if (isInterruptEvent(activeEvent)) {
      actions.cancelCurrentInterruptAndResumeTask();
    } else if (isBreakEvent(activeEvent)) {
      actions.stopBreakAndResumePreviousTask();
    } else {
      actions.stopCurrentEvent();
    }
  };

  // 休憩開始はモーダルオープン時に行う

  // --- UI ---
  // モーダルは常に描画し、下部コントロールはモーダルが開いていなくかつアクティブイベントが未終了の場合のみ描画
  return (
    <>
      <InterruptModal
        open={isModalOpen}
        onOpenChange={(openState) => {
          if (!openState) closeInterruptModal();
        }}
        form={interruptFormState}
        setForm={setInterruptFormState}
        onSubmit={handleSubmitInterrupt}
        onCancel={handleCancelInterrupt}
        onSave={handleSaveInterrupt}
        startTime={isInterruptEvent(activeEvent) ? activeEvent.start : undefined}
      />
      {/* 休憩モーダル */}
      <BreakModal
        isOpen={isBreakModalOpen}
        onOpenChange={(open) => { if (!open) handleCancelBreak(); }}
        formState={breakFormState}
        setFormState={setBreakFormState}
        onSubmit={handleSubmitBreak}
        onSave={handleSaveBreak}
        onCancel={handleCancelBreak}
        elapsedTime={elapsedTime}
        activeEvent={activeEvent}
      />

      {(!isModalOpen && activeEvent && !activeEvent.end) && (
        <div className={floatingControls.container}>
          <div className={floatingControls.info}>
            {isTaskEvent(activeEvent) && <Play className={`${iconSizes.md} ${colors.activeText}`} />}
            {isInterruptEvent(activeEvent) && <Zap className={`${iconSizes.md} text-yellow-500`} />}
            {isBreakEvent(activeEvent) && <Coffee className={`${iconSizes.md} text-blue-500`} />}
            <div className={typography.textSm}>
              <p className={`${typography.fontMedium} ${floatingControls.label}`} title={activeEvent?.label || t('controls.noActiveEvent')}>
                {activeEvent?.label || t('controls.noActiveEvent')}
              </p>
              <p className={`${typography.textBase} ${colors.timerText}`}>
                {formatElapsedTime(activeEvent.start)}
              </p>
            </div>
          </div>

          <div className={floatingControls.controls}>
            {isTaskEvent(activeEvent) && (
              <Button onClick={openInterruptModal} variant="outline" size="sm" className={`${floatingControls.button} ${colors.interrupt}`}>
                <Zap className={`mr-1.5 ${iconSizes.sm}`} /> {t('controls.interrupt')}
              </Button>
            )}
            {(activeEvent || isModalOpen) && (
              <Button onClick={handleStop} variant="destructive" size="sm" className={floatingControls.button}>
                <Square className={`mr-1.5 ${iconSizes.sm}`} /> {t('controls.stop')}
              </Button>
            )}
            {isTaskEvent(activeEvent) && (
              <Button onClick={openBreakModal} variant="outline" size="sm" className={`${floatingControls.button} ${colors.break}`}>
                <Coffee className={`mr-1.5 ${iconSizes.sm}`} /> {t('controls.break')}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
} 