/**
 * アプリケーション全体で使用する定数
 */

// タイマー関連
export const TIMER_UPDATE_INTERVAL_MS = 1000; // 1秒ごとにタイマー更新

// イベント履歴表示
export const YESTERDAY_EVENTS_LIMIT = 5; // 昨日のイベント表示件数

// レポート表示
export const RECENT_EVENTS_LIMIT = 10; // 最近のイベント表示件数

// 休憩オプション
export const BREAK_OPTIONS = [
  { value: 'short', label: '短い休憩', defaultMinutes: 5 },
  { value: 'coffee', label: 'コーヒーブレイク', defaultMinutes: 15 },
  { value: 'lunch', label: '昼休憩', defaultMinutes: 60 },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '時間未定' },
];

// 割り込みカテゴリ（シンプル版）
export const DEFAULT_INTERRUPT_CATEGORIES = {
  category1: 'ミーティング',
  category2: '電話',
  category3: 'メール',
  category4: 'チャット',
  category5: '質問',
  category6: 'その他'
} as const;

export const INTERRUPT_CATEGORY_COLORS = {
  category1: '#EF4444', // 赤
  category2: '#F59E0B', // オレンジ
  category3: '#3B82F6', // 青
  category4: '#8B5CF6', // 紫
  category5: '#10B981', // 緑
  category6: '#6B7280'  // グレー
} as const;

// 緊急度レベル
export const URGENCY_LEVELS = ['Low', 'Medium', 'High'] as const;
export type UrgencyLevel = typeof URGENCY_LEVELS[number];