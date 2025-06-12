'use client';

import React, { useState, useEffect } from 'react';
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

// --- ユーティリティ ---
// 経過時間をhh:mm:ssで返す
const formatElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 休憩オプション定義
const breakOptions = [
  { value: 'short', label: '短い休憩', defaultMinutes: 5 },
  { value: 'coffee', label: 'コーヒーブレイク', defaultMinutes: 15 },
  { value: 'lunch', label: '昼休憩', defaultMinutes: 60 },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '時間未定' },
];

// 型ガード: Eventが特定のtypeかどうか
const isTaskEvent = (e?: Event): e is Event & { type: 'task' } => e?.type === 'task';
const isInterruptEvent = (e?: Event): e is Event & { type: 'interrupt' } => e?.type === 'interrupt';
const isBreakEvent = (e?: Event): e is Event & { type: 'break' } => e?.type === 'break';

export default function FloatingActionControls() {
  // --- ストア・状態管理 ---
  const { currentEventId, events, actions, isHydrated } = useEventsStore();
  const [activeEvent, setActiveEvent] = useState<Event | undefined>(undefined);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

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
  console.log('[FAC] isModalOpen from hook:', isModalOpen);

  // --- タイマー管理 ---
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const current = events.find(e => e.id === currentEventId);
    setActiveEvent(current);

    let timerId: NodeJS.Timeout | undefined;

    if (current && !current.end) {
      setElapsedTime(formatElapsedTime(current.start));

      // Always start timer for active events
      timerId = setInterval(() => {
        // ストアから最新のイベント情報を取得して経過時間を更新
        const storeState = useEventsStore.getState();
        const latestCurrentEvent = storeState.events.find(e => e.id === storeState.currentEventId);
        if (latestCurrentEvent && !latestCurrentEvent.end) {
          setElapsedTime(formatElapsedTime(latestCurrentEvent.start));
        } else {
          setElapsedTime('00:00:00');
          if(timerId) clearInterval(timerId);
        }
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => { if (timerId) clearInterval(timerId); };
  }, [currentEventId, events, isHydrated]);

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
          if (!openState) handleCancelInterrupt();
        }}
        form={interruptFormState}
        setForm={setInterruptFormState}
        onSubmit={handleSubmitInterrupt}
        onCancel={handleCancelInterrupt}
        onSave={handleSaveInterrupt}
        startTime={isInterruptEvent(activeEvent) ? activeEvent.start : undefined}
      />
      {/* 休憩モーダル */}
      <Dialog open={isBreakModalOpen} onOpenChange={(open) => { if (!open) handleCancelBreak(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>On Break</DialogTitle>
            {/* 経過時間タイマー表示 */}
            {isBreakEvent(activeEvent) && (
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-2">
                {elapsedTime}
              </p>
            )}
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div>
              <Label htmlFor="break-label" className="text-base font-medium">Break Label (optional)</Label>
              <Input
                id="break-label"
                placeholder="e.g., Coffee break, Brainstorming"
                value={breakFormState.label}
                onChange={(e) => setBreakFormState({ ...breakFormState, label: e.target.value })}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSubmitBreak(); }}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={handleSubmitBreak} variant="destructive" className="flex-1">
              <Play className="mr-1.5 h-4 w-4" />
              Save & Resume
            </Button>
            <Button type="button" onClick={handleSaveBreak} variant="outline" className="flex-1">
              <Coffee className="mr-1.5 h-4 w-4" />
              Save & End
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancelBreak}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(!isModalOpen && !isBreakModalOpen && activeEvent && !activeEvent.end) && (
        <div className="fixed bottom-16 left-0 right-0 z-20 flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-3">
            {isTaskEvent(activeEvent) && <Play className="h-5 w-5 text-green-500" />}
            {isInterruptEvent(activeEvent) && <Zap className="h-5 w-5 text-yellow-500" />}
            {isBreakEvent(activeEvent) && <Coffee className="h-5 w-5 text-blue-500" />}
            <div className="text-sm">
              <p className="font-medium truncate max-w-[150px] sm:max-w-xs" title={activeEvent?.label || 'No active event'}>
                {activeEvent?.label || 'No active event'}
              </p>
              <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                {elapsedTime}
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            {isTaskEvent(activeEvent) && (
              <Button onClick={openInterruptModal} variant="outline" size="sm" className="flex-1 sm:flex-none border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-900/50">
                <Zap className="mr-1.5 h-4 w-4" /> Interrupt
              </Button>
            )}
            {(activeEvent || isModalOpen) && (
              <Button onClick={handleStop} variant="destructive" size="sm" className="flex-1 sm:flex-none">
                <Square className="mr-1.5 h-4 w-4" /> Stop
              </Button>
            )}
            {isTaskEvent(activeEvent) && (
              <Button onClick={openBreakModal} variant="outline" size="sm" className="flex-1 sm:flex-none border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/50">
                <Coffee className="mr-1.5 h-4 w-4" /> Break
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
} 