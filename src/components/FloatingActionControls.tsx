'use client';

import React, { useState, useEffect } from 'react';
import useEventsStore from '@/store/useEventsStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Square, Zap, Coffee, Play } from 'lucide-react';
import { Event } from '@/types'; // Event型をインポート

// 経過時間をフォーマットするヘルパー関数 (hh:mm:ss)
const formatElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00'; // 未来の時間は表示しない

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};


export default function FloatingActionControls() {
  const { currentEventId, events, actions } = useEventsStore();
  const [activeEvent, setActiveEvent] = useState<Event | undefined>(undefined);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  const [interruptLabel, setInterruptLabel] = useState('');
  const [breakLabel, setBreakLabel] = useState('');
  
  // モーダルの開閉状態を管理
  const [isInterruptModalOpen, setIsInterruptModalOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);


  useEffect(() => {
    const current = events.find(e => e.id === currentEventId);
    setActiveEvent(current);

    let timerInterval: NodeJS.Timeout | undefined;
    if (current && !current.end) {
      setElapsedTime(formatElapsedTime(current.start)); // 初期表示
      timerInterval = setInterval(() => {
        setElapsedTime(formatElapsedTime(current.start));
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [currentEventId, events]);

  const handleStop = () => {
    actions.stopCurrentEvent();
  };

  const handleStartInterrupt = () => {
    actions.startInterrupt(interruptLabel.trim() || 'Interrupt');
    setInterruptLabel('');
    setIsInterruptModalOpen(false); // モーダルを閉じる
  };

  const handleStartBreak = () => {
    actions.startBreak(breakLabel.trim() || 'Break');
    setBreakLabel('');
    setIsBreakModalOpen(false); // モーダルを閉じる
  };

  if (!activeEvent) {
    // アクティブなイベントがない場合は何も表示しないか、
    // あるいは「クイックスタート」のUIをここに表示することも検討できる
    return null; 
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:gap-4">
      <div className="flex items-center gap-3">
        {activeEvent.type === 'task' && <Play className="h-5 w-5 text-green-500" />}
        {activeEvent.type === 'interrupt' && <Zap className="h-5 w-5 text-yellow-500" />}
        {activeEvent.type === 'break' && <Coffee className="h-5 w-5 text-blue-500" />}
        <div className="text-sm">
          <p className="font-medium truncate max-w-[150px] sm:max-w-xs" title={activeEvent.label || 'Unnamed Task'}>
            {activeEvent.label || 'Unnamed Task'}
          </p>
          <p className="text-base font-semibold text-blue-600 dark:text-blue-400">{elapsedTime}</p>
        </div>
      </div>

      <div className="flex w-full gap-2 sm:w-auto">
        <Button onClick={handleStop} variant="destructive" size="sm" className="flex-1 sm:flex-none">
          <Square className="mr-1.5 h-4 w-4" /> Stop
        </Button>

        {activeEvent.type === 'task' && (
          <>
            {/* Interrupt Modal Trigger */}
            <Dialog open={isInterruptModalOpen} onOpenChange={setIsInterruptModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-900/50">
                  <Zap className="mr-1.5 h-4 w-4" /> Interrupt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Interrupt</DialogTitle>
                  <DialogDescription>
                    Enter a label for this interrupt (optional).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    id="interrupt-label"
                    placeholder="e.g., Phone call, Quick question"
                    value={interruptLabel}
                    onChange={(e) => setInterruptLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStartInterrupt()}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button type="button" variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleStartInterrupt}>Start Interrupt</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Break Modal Trigger */}
            <Dialog open={isBreakModalOpen} onOpenChange={setIsBreakModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/50">
                  <Coffee className="mr-1.5 h-4 w-4" /> Break
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Break</DialogTitle>
                  <DialogDescription>
                    Enter a label for this break (optional).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    id="break-label"
                    placeholder="e.g., Short break, Lunch"
                    value={breakLabel}
                    onChange={(e) => setBreakLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStartBreak()}
                  />
                </div>
                <DialogFooter>
                   <DialogClose asChild>
                     <Button type="button" variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleStartBreak}>Start Break</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
} 