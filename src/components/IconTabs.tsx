'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', icon: Home, label: 'ログ' },
  { href: '/report', icon: BarChart2, label: 'レポート' },
  { href: '/settings', icon: SettingsIcon, label: '設定' },
];

const IconTabs = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center rounded-md p-3',
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
            aria-label={item.label}
          >
            <IconComponent className={clsx("h-6 w-6", isActive ? "text-blue-500 dark:text-blue-400" : "")} />
          </Link>
        );
      })}
    </nav>
  );
};

export default IconTabs; 