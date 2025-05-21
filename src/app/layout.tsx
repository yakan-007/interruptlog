import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientProviders from '@/app/(providers)/client-providers'; // Re-enable ClientProviders
import IconTabs from '@/components/IconTabs'; // Re-enable IconTabs
import React from 'react';
import { GeistSans } from 'geist/font/sans';
import FloatingActionControls from '@/components/FloatingActionControls';
import { I18nProviderClient } from '@/locales/client';
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
  const defaultUrl = process.env.VERCEL_URL;
  const locale = await getCurrentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${GeistSans.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <I18nProviderClient locale={locale}>
          <ClientProviders>
            <main className="pb-16">{children}</main>
            <FloatingActionControls />
            <IconTabs /> {/* Re-enable IconTabs */}
          </ClientProviders>
        </I18nProviderClient>
      </body>
    </html>
  );
} 