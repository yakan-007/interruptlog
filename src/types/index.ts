export interface Event {
  id: string; // uuid
  type: 'task' | 'interrupt' | 'break';
  label?: string; // optional free text
  start: number; // epoch ms
  end?: number; // epoch ms (undefined while running)
  notes?: string; // 詳細なメモ (追加)
  meta?: {
    myTaskId?: string;
    // 他のメタ情報があればここに追加
  };
  // Interruptモーダル用の新しいフィールド
  who?: string; 
  organization?: string;
  interruptType?: string;
  urgency?: 'Low' | 'Medium' | 'High';
  originalTaskId?: string; 
  // Breakモーダル用の新しいフィールド
  breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite';
  breakDurationMinutes?: number | null;
}

export type MyTask = {
  id: string; // uuid
  name: string;
  isCompleted: boolean;
  order: number; // for sorting
}; 