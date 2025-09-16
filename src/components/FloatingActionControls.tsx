'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Play } from 'lucide-react';
import ActiveEventDisplay from '@/components/ActiveEventDisplay';
import EventControlButtons from '@/components/EventControlButtons';
import { useEventControls } from '@/hooks/useEventControls';
import InterruptModal from '@/components/InterruptModal';
import useEventsStore from '@/store/useEventsStore';

export default function FloatingActionControls() {
  const { isHydrated } = useEventsStore();
  const {
    activeEvent,
    isEventActive,
    isTaskActive,
    isInterruptActive,
    isStopConfirmOpen,
    handleStopEvent,
    handleStartInterrupt,
    handleStartBreak,
    handleResumeTask,
    openStopConfirm,
    closeStopConfirm,
    breakModal,
    interruptModal,
  } = useEventControls();

  // ロード中またはアクティブなイベントが無い場合は表示しない
  if (!isHydrated || !activeEvent) {
    return null;
  }

  return (
    <>
      {/* Interrupt Modal */}
      <InterruptModal
        open={interruptModal.isModalOpen}
        onOpenChange={() => {}}
        form={interruptModal.interruptFormState}
        setForm={interruptModal.setInterruptFormState}
        onSubmit={interruptModal.handleSubmitInterrupt}
        onCancel={interruptModal.handleCancelInterrupt}
        onSave={interruptModal.handleSaveInterrupt}
        startTime={isInterruptActive ? activeEvent.start : undefined}
      />

      {/* Break Modal */}
      <Dialog open={breakModal.isBreakModalOpen} onOpenChange={() => {}}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="[&>button]:hidden">
          <DialogHeader>
            <DialogTitle>休憩中</DialogTitle>
            <ActiveEventDisplay activeEvent={activeEvent} />
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button 
              type="button" 
              onClick={breakModal.handleSubmitBreak} 
              variant="destructive" 
              className="flex-1"
            >
              <Play className="mr-1.5 h-4 w-4" />
              保存して再開
            </Button>
            <Button 
              type="button" 
              onClick={breakModal.handleSaveBreak} 
              variant="outline" 
              className="flex-1"
            >
              保存して終了
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={breakModal.handleCancelBreak}
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation Dialog */}
      <Dialog open={isStopConfirmOpen} onOpenChange={closeStopConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>イベントを停止しますか？</DialogTitle>
            <DialogDescription>
              現在の{isTaskActive ? 'タスク' : isInterruptActive ? '割り込み' : '休憩'}を停止します。
              {isInterruptActive && '前のタスクに自動で戻ります。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeStopConfirm}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleStopEvent}>
              停止
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Control Panel */}
      {!interruptModal.isModalOpen && !breakModal.isBreakModalOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ActiveEventDisplay activeEvent={activeEvent} />
            <EventControlButtons
              activeEvent={activeEvent}
              onStopEvent={openStopConfirm}
              onStartInterrupt={handleStartInterrupt}
              onStartBreak={handleStartBreak}
            />
          </div>
        </div>
      )}
    </>
  );
} 