// Tailwindクラスの定数定義
// よく使用されるスタイルクラスを一箇所で管理

export const buttonSizes = {
  sm: 'size-sm',
  md: 'size-md',
  lg: 'size-lg',
} as const;

export const buttonVariants = {
  default: 'variant-default',
  destructive: 'variant-destructive',
  outline: 'variant-outline',
  ghost: 'variant-ghost',
} as const;

// レイアウト関連
export const layout = {
  container: 'container mx-auto p-4 pb-16',
  section: 'mb-8',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexGrow: 'flex-grow',
  flexGap2: 'flex gap-2',
  flexGap3: 'flex gap-3',
  flexGap4: 'flex gap-4',
  spaceY2: 'space-y-2',
  spaceY4: 'space-y-4',
} as const;

// テキスト関連
export const typography = {
  title: 'text-2xl font-bold mb-4',
  sectionTitle: 'text-xl font-semibold mb-2',
  fontMedium: 'font-medium',
  fontSemibold: 'font-semibold',
  textSm: 'text-sm',
  textBase: 'text-base',
  textGray: 'text-gray-500',
  textGrayDark: 'text-gray-600 dark:text-gray-300',
  lineThrough: 'line-through text-gray-500',
  truncate: 'truncate',
} as const;

// カラー関連
export const colors = {
  // アクティブ状態
  activeTask: 'bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600',
  activeText: 'text-green-600 dark:text-green-400',
  
  // ボタンカラー
  interrupt: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
  break: 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/50',
  
  // タイマー表示
  timerText: 'text-blue-600 dark:text-blue-400 font-semibold',
  
  // その他
  mutedText: 'text-muted-foreground',
  borderColor: 'border',
} as const;

// タスク関連スタイル
export const taskStyles = {
  // カード基本スタイル
  cardBase: 'flex items-center justify-between p-3 transition-all',
  
  // ドラッグ状態
  dragging: 'opacity-75 shadow-2xl scale-105 transform',
  dragOver: 'border-2 border-blue-500 dark:border-blue-300 ring-2 ring-blue-300',
  
  // ドラッグハンドル
  dragHandle: 'cursor-grab p-1 mr-2',
  dragIcon: 'h-5 w-5 text-gray-400',
  
  // チェックボックス・ラベル
  checkbox: 'mr-3',
  taskLabel: 'flex-grow',
  
  // ボタンコンテナ
  buttonContainer: 'flex gap-2 ml-2',
  actionButtons: 'flex items-center',
} as const;

// アイコンサイズ
export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

// モーダル・ダイアログ関連
export const modal = {
  content: 'sm:max-w-[525px]',
  grid: 'grid gap-4 py-4',
  footer: 'gap-2',
  warning: 'text-xs text-muted-foreground',
} as const;

// フローティングコントロール関連
export const floatingControls = {
  container: 'fixed bottom-16 left-0 right-0 z-20 flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:gap-4',
  info: 'flex items-center gap-3',
  label: 'text-sm font-medium truncate max-w-[150px] sm:max-w-xs',
  controls: 'flex w-full gap-2 sm:w-auto',
  button: 'flex-1 sm:flex-none',
} as const;

// イベント履歴関連
export const eventHistory = {
  listItem: 'p-3 border rounded-md text-sm',
  eventLabel: 'font-medium',
  eventTime: 'text-gray-600 dark:text-gray-300 ml-2',
} as const; 