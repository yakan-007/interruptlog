import { useState, useCallback } from 'react';
import useEventsStore from '@/store/useEventsStore';
import useBreakModal from './useBreakModal';
import useInterruptModal from './useInterruptModal';

/**
 * イベント制御のロジックを管理するカスタムフック
 */
export function useEventControls() {
  const { actions, currentEventId, events } = useEventsStore();
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);

  const breakModal = useBreakModal();
  const interruptModal = useInterruptModal();

  const activeEvent = currentEventId 
    ? events.find(event => event.id === currentEventId) 
    : null;

  const isEventActive = !!activeEvent;

  // Stop current event
  const handleStopOnly = useCallback(() => {
    if (!activeEvent) return;

    try {
      actions.stopCurrentEvent();
      setIsStopConfirmOpen(false);
    } catch (error) {
      console.error('Error stopping event:', error);
    }
  }, [activeEvent, actions]);

  const handleStopAndComplete = useCallback(() => {
    if (!activeEvent) return;

    try {
      const taskId = activeEvent.type === 'task' ? activeEvent.meta?.myTaskId : undefined;
      actions.stopCurrentEvent();
      if (activeEvent.type === 'task' && taskId) {
        actions.setMyTaskCompletion(taskId, true);
      }
      setIsStopConfirmOpen(false);
    } catch (error) {
      console.error('Error stopping event:', error);
    }
  }, [activeEvent, actions]);

  // Start interrupt (during task)
  const handleStartInterrupt = useCallback(() => {
    if (!activeEvent || activeEvent.type !== 'task') return;
    
    interruptModal.openInterruptModal();
  }, [activeEvent, interruptModal]);

  // Start break (during task)
  const handleStartBreak = useCallback(() => {
    if (!activeEvent || activeEvent.type !== 'task') return;
    
    breakModal.openBreakModal();
  }, [activeEvent, breakModal]);

  // Resume previous task after interrupt
  const handleResumeTask = useCallback(() => {
    if (!activeEvent || activeEvent.type !== 'interrupt') return;

    try {
      actions.stopInterruptAndResumePreviousTask();
    } catch (error) {
      console.error('Error resuming task:', error);
    }
  }, [activeEvent, actions]);

  // Stop confirmation dialog handlers
  const openStopConfirm = useCallback(() => {
    setIsStopConfirmOpen(true);
  }, []);

  const closeStopConfirm = useCallback(() => {
    setIsStopConfirmOpen(false);
  }, []);

  // Event type checks
  const isTaskActive = activeEvent?.type === 'task';
  const isInterruptActive = activeEvent?.type === 'interrupt';
  const isBreakActive = activeEvent?.type === 'break';

  const canCompleteTask = activeEvent?.type === 'task' && Boolean(activeEvent.meta?.myTaskId);

  return {
    // State
    activeEvent,
    isEventActive,
    isTaskActive,
    isInterruptActive,
    isBreakActive,
    isStopConfirmOpen,
    canCompleteTask,

    // Actions
    handleStopOnly,
    handleStopAndComplete,
    handleStartInterrupt,
    handleStartBreak,
    handleResumeTask,
    openStopConfirm,
    closeStopConfirm,

    // Modal controls
    breakModal,
    interruptModal,
  };
}

/**
 * イベント操作のためのシンプルなフック
 */
export function useSimpleEventControls() {
  const { actions } = useEventsStore();

  const startTask = useCallback((label: string, taskId?: string) => {
    actions.startTask(label, taskId);
  }, [actions]);

  const stopCurrentEvent = useCallback(() => {
    actions.stopCurrentEvent();
  }, [actions]);

  const startInterrupt = useCallback((data?: {
    label?: string;
    who?: string;
    interruptType?: string;
    urgency?: 'Low' | 'Medium' | 'High';
  }) => {
    actions.startInterrupt(data);
  }, [actions]);

  const startBreak = useCallback((data: {
    label?: string;
    breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite';
    breakDurationMinutes?: number;
  }) => {
    actions.startBreak(data);
  }, [actions]);

  return {
    startTask,
    stopCurrentEvent,
    startInterrupt,
    startBreak,
  };
}
