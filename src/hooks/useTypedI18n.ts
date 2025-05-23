'use client';

import { useI18n } from '@/locales/client';
import type { TypedI18nFunction, I18nKeys, I18nKeysWithParams } from '@/types/i18n';

// 型安全な翻訳フック
export const useTypedI18n = (): TypedI18nFunction => {
  const originalT = useI18n() as any; // 型エラー回避のため一時的にanyを使用

  // オーバーロードされた関数を返す
  return ((key: I18nKeys | I18nKeysWithParams, params?: Record<string, string | number>) => {
    if (params) {
      // パラメータ付きの翻訳
      return originalT(key, params);
    } else {
      // 通常の翻訳
      return originalT(key);
    }
  }) as TypedI18nFunction;
};

// より簡潔な使用のためのエイリアス
export const useT = useTypedI18n; 