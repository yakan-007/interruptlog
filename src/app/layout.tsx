import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientProviders from '@/app/(providers)/client-providers'; // Re-enable ClientProviders
import IconTabs from '@/components/IconTabs'; // Re-enable IconTabs
import React from 'react';
import { GeistSans } from 'geist/font/sans';
import FloatingActionControls from '@/components/FloatingActionControls';
import dynamic from 'next/dynamic';
// クライアントサイドでのみ読み込む I18n プロバイダー
import I18nClientSideProvider from './i18n-provider';
import { getCurrentLocale } from '@/locales/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InterruptLog',
  description: 'Minimal MVP for InterruptLog',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${GeistSans.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <I18nClientSideProvider locale={locale}>
          <ClientProviders>
            <main className="pb-16">{children}</main>
            <FloatingActionControls />
            <IconTabs /> {/* Re-enable IconTabs */}
          </ClientProviders>
        </I18nClientSideProvider>
      </body>
    </html>
  );
} 