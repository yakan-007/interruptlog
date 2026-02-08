import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from '@/app/(providers)/client-providers';
import IconTabs from '@/components/IconTabs';
import React from 'react';
import { GeistSans } from 'geist/font/sans';
import FloatingActionControls from '@/components/FloatingActionControls';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'InterruptLog',
  description: 'Minimal MVP for InterruptLog',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultUrl = process.env.VERCEL_URL;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <ErrorBoundary>
          <ClientProviders> 
            <main className="pb-[calc(env(safe-area-inset-bottom)+5rem)]">{children}</main>
            <FloatingActionControls />
            <IconTabs />
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
} 
