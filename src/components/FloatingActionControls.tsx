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
    canCompleteTask,
    isStopConfirmOpen,
    handleStopOnly,
    handleStopAndComplete,
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
            <DialogTitle>作業を停止しますか？</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              タイマーを停止すると現在の{isTaskActive ? 'タスク' : isInterruptActive ? '割り込み' : '休憩'}は終了します。
              {isInterruptActive && '停止後は前のタスクに自動で戻ります。'}
              {isTaskActive && ' 停止後に完了扱いにするか選択できます。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={closeStopConfirm} className="w-full sm:w-auto">
              キャンセル
            </Button>
            {isTaskActive && canCompleteTask ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handleStopOnly}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  停止のみ
                </Button>
                <Button
                  onClick={handleStopAndComplete}
                  className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                >
                  停止して完了
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStopOnly}
                className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 sm:w-auto"
              >
                停止
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Control Panel */}
      {!interruptModal.isModalOpen && !breakModal.isBreakModalOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-gray-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
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
