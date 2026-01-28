'use client';

import { ReactNode } from 'react';

interface ProGateProps {
  proAccess: boolean;
  lockedTitle: string;
  lockedDescription?: string;
  children: ReactNode;
}

export default function ProGate({
  proAccess,
  lockedTitle,
  lockedDescription = 'Proで解放されます。',
  children,
}: ProGateProps) {
  if (proAccess) {
    return <>{children}</>;
  }

  return (
    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="font-semibold">{lockedTitle}</div>
      <p className="mt-2 text-xs">{lockedDescription}</p>
    </div>
  );
}
