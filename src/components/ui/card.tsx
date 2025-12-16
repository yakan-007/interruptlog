import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export const Card: React.FC<CardProps> = ({ className = '', ...props }) => (
  <div
    className={[
      'rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={['p-4 border-b border-gray-200 dark:border-gray-700', className].filter(Boolean).join(' ')} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', ...props }) => (
  <h3 className={['text-lg font-semibold', className].filter(Boolean).join(' ')} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={['p-4', className].filter(Boolean).join(' ')} {...props} />
); 