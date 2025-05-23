// next-international の型定義

// 日本語ロケールの型定義（基本型として使用）
import type jaLocale from '@/locales/ja';

// 翻訳キーの型定義
export type TranslationKeys = typeof jaLocale;

// ネストしたオブジェクトのキーを取得する型
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

// 翻訳関数の型定義
export type TranslationFunction = {
  // ドット記法のキーに対応
  (key: NestedKeyOf<TranslationKeys>): string;
  // パラメータ付きの翻訳 (例: {elapsedTime} を含むキー)
  (key: NestedKeyOf<TranslationKeys>, params: Record<string, string | number>): string;
};

// より具体的な型定義（使用する主要なキー）
export type I18nKeys = 
  | 'appTitle'
  | 'InterruptModal.title'
  | 'InterruptModal.elapsedTimeLabel'
  | 'InterruptModal.description'
  | 'InterruptModal.labelPlaceholder'
  | 'InterruptModal.notesPlaceholder'
  | 'InterruptModal.whoPlaceholder'
  | 'InterruptModal.urgencyLabel'
  | 'InterruptModal.urgencyPlaceholder'
  | 'InterruptModal.urgencyLow'
  | 'InterruptModal.urgencyMedium'
  | 'InterruptModal.urgencyHigh'
  | 'InterruptModal.saveAndResumeButton'
  | 'InterruptModal.saveButton'
  | 'InterruptModal.cancelButton'
  | 'InterruptModal.selectPlaceholder'
  | 'InterruptModal.directInputPlaceholder'
  | 'InterruptModal.organizationPlaceholder'
  | 'controls.interrupt'
  | 'controls.stop'
  | 'controls.break'
  | 'controls.noActiveEvent'
  | 'breakModal.title'
  | 'breakModal.description'
  | 'breakModal.labelPlaceholder'
  | 'breakModal.cancelWarningPrefix'
  | 'breakModal.cancelWarningSuffix'
  | 'breakModal.saveAndResume'
  | 'breakModal.saveOnly'
  | 'breakModal.discardAndResume'
  | 'tasks.myTasks'
  | 'tasks.newTaskPlaceholder'
  | 'tasks.addTask'
  | 'tasks.noTasksMessage'
  | 'tasks.startTaskTitle'
  | 'tasks.deleteTaskTitle'
  | 'eventHistory.title'
  | 'eventHistory.noEventsMessage'
  | 'eventHistory.active'
  | 'eventHistory.unnamed';

// パラメータが必要なキー
export type I18nKeysWithParams = 'breakModal.elapsedTime';

// 型安全な翻訳関数
export interface TypedI18nFunction {
  (key: I18nKeys): string;
  (key: I18nKeysWithParams, params: Record<string, string | number>): string;
} 