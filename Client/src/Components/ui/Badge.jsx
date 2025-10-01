import React from 'react';

// Generic pill badge component
// Props: variant (solid|soft|outline), tone (info|success|warning|danger|neutral|brand|purple|indigo|amber|rose|sky), icon, children, size
const toneClasses = {
  info:   { solid:'bg-sky-600 text-white', soft:'bg-sky-100 text-sky-700', outline:'text-sky-600 border border-sky-300' },
  success:{ solid:'bg-emerald-600 text-white', soft:'bg-emerald-100 text-emerald-700', outline:'text-emerald-600 border border-emerald-300' },
  warning:{ solid:'bg-amber-600 text-white', soft:'bg-amber-100 text-amber-700', outline:'text-amber-600 border border-amber-300' },
  danger: { solid:'bg-rose-600 text-white', soft:'bg-rose-100 text-rose-700', outline:'text-rose-600 border border-rose-300' },
  neutral:{ solid:'bg-gray-600 text-white', soft:'bg-gray-200 text-gray-700', outline:'text-gray-600 border border-gray-300' },
  brand:  { solid:'bg-blue-600 text-white', soft:'bg-blue-100 text-blue-700', outline:'text-blue-600 border border-blue-300' },
  purple: { solid:'bg-purple-600 text-white', soft:'bg-purple-100 text-purple-700', outline:'text-purple-600 border border-purple-300' },
  indigo: { solid:'bg-indigo-600 text-white', soft:'bg-indigo-100 text-indigo-700', outline:'text-indigo-600 border border-indigo-300' },
  amber:  { solid:'bg-amber-600 text-white', soft:'bg-amber-100 text-amber-700', outline:'text-amber-600 border border-amber-300' },
  rose:   { solid:'bg-rose-600 text-white', soft:'bg-rose-100 text-rose-700', outline:'text-rose-600 border border-rose-300' },
  sky:    { solid:'bg-sky-600 text-white', soft:'bg-sky-100 text-sky-700', outline:'text-sky-600 border border-sky-300' },
};

const sizeMap = {
  xs: 'text-[10px] px-2 py-0.5',
  sm: 'text-xs px-2.5 py-0.5',
  md: 'text-xs px-3 py-1',
  lg: 'text-sm px-3.5 py-1.5'
};

const Badge = ({ variant='soft', tone='neutral', icon:Icon, children, className='', size='sm', rounded='full', pulse=false }) => {
  const toneSet = toneClasses[tone] || toneClasses.neutral;
  const style = toneSet[variant] || toneSet.soft;
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-${rounded} ${sizeMap[size]} ${style} ${pulse ? 'animate-pulse' : ''} transition shadow-sm`}>      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="leading-none">{children}</span>
    </span>
  );
};

export default Badge;
