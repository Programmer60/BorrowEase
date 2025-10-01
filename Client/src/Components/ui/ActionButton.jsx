import React from 'react';

// Unified button styling for bulk actions / toolbar
// variant: primary | danger | warn | neutral | outline | success | indigo
const variantMap = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  warn: 'bg-amber-600 hover:bg-amber-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  neutral: 'bg-gray-600 hover:bg-gray-700 text-white',
  outline: 'border border-gray-300 hover:border-gray-400 text-gray-700 bg-white',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white'
};

const base = 'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition';

const ActionButton = ({ variant='primary', children, className='', ...rest }) => {
  return (
    <button className={`${base} ${variantMap[variant] || variantMap.primary} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export default ActionButton;
