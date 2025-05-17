import React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', ...props }, ref) => {
    const base = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500';
    return <input type="checkbox" ref={ref} className={[base, className].filter(Boolean).join(' ')} {...props} />;
  },
);
Checkbox.displayName = 'Checkbox';

export default Checkbox; 