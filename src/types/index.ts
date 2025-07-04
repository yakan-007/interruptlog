export interface Event {
  id: string; // uuid
  type: 'task' | 'interrupt' | 'break';
  label?: string; // optional free text
  start: number; // epoch ms
  end?: number; // epoch ms (undefined while running)
  categoryId?: string; // カテゴリID（直接参照）
  meta?: {
    myTaskId?: string;
    isUnknownActivity?: boolean; // For events created when editing past events
    // 他のメタ情報があればここに追加
  };
  // Interruptモーダル用の新しいフィールド
  who?: string; 
  interruptType?: string;
  urgency?: 'Low' | 'Medium' | 'High';
  originalTaskId?: string; 
  // Breakモーダル用の新しいフィールド
  breakType?: 'short' | 'coffee' | 'lunch' | 'custom' | 'indefinite';
  breakDurationMinutes?: number | null;
  // メモ機能用のフィールド（後から追記可能）
  memo?: string;
}

export type MyTask = {
  id: string; // uuid
  name: string;
  isCompleted: boolean;
  order: number; // for sorting
  categoryId?: string; // カテゴリID（オプション）
};

export type Category = {
  id: string; // uuid
  name: string;
  color: string; // HEXカラーコード（例: #34D399）
  order: number; // 表示順
};

// シンプルな割り込みカテゴリ設定（6つの固定カテゴリ名のみ変更可能）
export type InterruptCategorySettings = {
  category1: string; // デフォルト: 'ミーティング'
  category2: string; // デフォルト: '電話'
  category3: string; // デフォルト: '質問'
  category4: string; // デフォルト: '訪問'
  category5: string; // デフォルト: 'チャット'
  category6: string; // デフォルト: 'その他'
}; 