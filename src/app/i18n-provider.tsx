'use client';

import React from 'react';
import { I18nProviderClient } from '@/locales/client';

export default function I18nClientSideProvider({ children, locale }: { children: React.ReactNode; locale: string }) {
  // const locale = useCurrentLocale();

  // locale が取得できない場合（初期レンダリング時など）のフォールバック
  // または、ここでロケールが undefined の場合の適切な処理を行う
  // if (!locale) {
    // console.warn('[I18nClientSideProvider] Locale not available from useCurrentLocale(), current value is:', locale, '. Falling back to default locale \\\'ja\\\'.');
    // next-international v5以降では、Providerにlocaleが渡されない場合、自動でフォールバックする可能性もあるが、
    // 明示的にデフォルトを渡すか、あるいはエラーやローディング状態を示すのが安全。
    // ここでは一時的にデフォルトロケール \'ja\' を使用する。
    // return <I18nProviderClient locale="ja">{children}</I18nProviderClient>;
  // }

  return <I18nProviderClient locale={locale}>{children}</I18nProviderClient>;
} 