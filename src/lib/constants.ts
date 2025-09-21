/**
 * アプリケーション全体で使用する定数
 */

// タイマー関連
export const TIMER_UPDATE_INTERVAL_MS = 1000; // 1秒ごとにタイマー更新

// 時間の閾値
export const TIME_THRESHOLDS = {
  GAP_MINIMUM_MS: 60 * 1000, // 1分（ギャップイベント作成の最小時間）
  AUTO_SAVE_DEBOUNCE_MS: 500, // 自動保存のデバウンス時間
  NOTIFICATION_DELAY_MS: 2000, // 通知表示時間
  TIMER_PRECISION_MS: 100, // タイマーの精度
} as const;

// イベント履歴表示
export const DISPLAY_LIMITS = {
  YESTERDAY_EVENTS: 5, // 昨日のイベント表示件数
  RECENT_EVENTS: 10, // 最近のイベント表示件数
  MAX_EVENT_HISTORY: 100, // イベント履歴の最大表示件数
  MAX_TASK_DISPLAY: 50, // タスク一覧の最大表示件数
} as const;

// UI文字列定数
export const UI_STRINGS = {
  // タスク関連
  TASK_PLACEHOLDER: '新しいタスク名',
  UNKNOWN_ACTIVITY: '不明なアクティビティ',
  NO_CATEGORY: 'カテゴリなし',
  
  // 時間表示
  TIMER_DEFAULT: '00:00:00',
  DURATION_ZERO: '0秒',
  
  // エラーメッセージ
  VALIDATION_REQUIRED: 'この項目は必須です',
  VALIDATION_INVALID_TIME: '有効な時刻を入力してください',
  VALIDATION_TIME_FUTURE: '終了時刻は現在時刻より前である必要があります',
  VALIDATION_TIME_ORDER: '終了時刻は開始時刻より後である必要があります',
  
  // 成功メッセージ
  SUCCESS_SAVE: '保存しました',
  SUCCESS_DELETE: '削除しました',
  SUCCESS_EXPORT: 'データをエクスポートしました',
  SUCCESS_IMPORT: 'データをインポートしました',
} as const;

// 休憩オプション
export const BREAK_OPTIONS = [
  { value: 'short', label: '短い休憩', defaultMinutes: 5 },
  { value: 'coffee', label: 'コーヒーブレイク', defaultMinutes: 15 },
  { value: 'lunch', label: '昼休憩', defaultMinutes: 60 },
  { value: 'custom', label: 'カスタム' },
  { value: 'indefinite', label: '時間未定' },
] as const;

// イベントタイプ
export const EVENT_TYPES = {
  TASK: 'task',
  INTERRUPT: 'interrupt', 
  BREAK: 'break',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

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

// カラーパレット
export const COLORS = {
  // プライマリカラー
  PRIMARY: '#3B82F6',
  SECONDARY: '#6B7280',
  
  // ステータスカラー
  SUCCESS: '#10B981',
  WARNING: '#F59E0B', 
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  
  // イベントタイプカラー
  TASK: '#10B981',
  INTERRUPT: '#EF4444',
  BREAK: '#6B7280',
  
  // グレーシェード
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',
} as const;

// 緊急度レベル
export const URGENCY_LEVELS = ['Low', 'Medium', 'High'] as const;
export type UrgencyLevel = typeof URGENCY_LEVELS[number];

// データ保持期間オプション
export const DATA_RETENTION_OPTIONS = [
  { value: 'none', label: '無制限（全データ保持）', days: null },
  { value: '1week', label: '1週間', days: 7 },
  { value: '1month', label: '1ヶ月', days: 30 },
  { value: '3months', label: '3ヶ月', days: 90 },
  { value: '6months', label: '6ヶ月', days: 180 },
  { value: '1year', label: '1年', days: 365 },
] as const;

// ローカルストレージキー
export const STORAGE_KEYS = {
  EVENTS: 'events-store',
  TASKS: 'mytasks-store',
  CATEGORIES: 'categories-store',
  SETTINGS: 'app-settings',
  DATA_MANAGEMENT: 'data-management-config',
  UI_STATE: 'ui-state',
} as const;

// アニメーション設定
export const ANIMATIONS = {
  DURATION_FAST: 150,
  DURATION_NORMAL: 300,
  DURATION_SLOW: 500,
  EASING_DEFAULT: 'ease-in-out',
  EASING_BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// レスポンシブブレークポイント
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px', 
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;
