import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Event } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 経過時間をhh:mm:ssで返す
export const formatElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const totalSeconds = Math.floor((now - startTime) / 1000);
  if (totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 型ガード: Eventが特定のtypeかどうか
export const isTaskEvent = (e?: Event): e is Event & { type: 'task' } => e?.type === 'task';
export const isInterruptEvent = (e?: Event): e is Event & { type: 'interrupt' } => e?.type === 'interrupt';
export const isBreakEvent = (e?: Event): e is Event & { type: 'break' } => e?.type === 'break';

// interruptTypeのlabelをi18nキー用に変換
export const toI18nKey = (label: string): string => {
  // 例: "Meeting"→"meeting"、"Q&A"→"qna"、"Other"→"other"
  return label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};
