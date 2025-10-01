import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

/**
 * Accessible custom checkbox supporting indeterminate state.
 * Props:
 *  - checked: boolean
 *  - indeterminate: boolean (visual only)
 *  - onChange: (newValue:boolean)=>void
 *  - disabled
 *  - size: tailwind sizing token (default '5')
 */
const CustomCheckbox = ({ checked, indeterminate=false, onChange, disabled=false, size='5', label, className='' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <label className={`inline-flex items-center cursor-pointer select-none group ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
      <span className={`relative inline-flex items-center justify-center rounded-md border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-transparent'
      } ${indeterminate && !checked ? 'bg-blue-500 border-blue-500' : ''} w-${size} h-${size}`}>        
        <input
          ref={ref}
          type="checkbox"
          aria-checked={indeterminate ? 'mixed' : checked}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Check className={`w-3 h-3 stroke-[3] transition-opacity duration-150 ${checked ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'} text-white`} />
        {indeterminate && !checked && (
          <span className="absolute w-2.5 h-0.5 bg-white rounded-sm" />
        )}
      </span>
      {label && <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
};

export default CustomCheckbox;
