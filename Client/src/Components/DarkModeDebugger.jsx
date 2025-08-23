import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DarkModeDebugger = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg z-50">
      <div className="text-sm">
        <div className="font-bold text-gray-900 dark:text-gray-100">Dark Mode Debug</div>
        <div className="text-gray-600 dark:text-gray-300">Current theme: {theme}</div>
        <div className="text-gray-600 dark:text-gray-300">Is dark: {isDark ? 'Yes' : 'No'}</div>
        <div className="text-gray-600 dark:text-gray-300">HTML class: {document.documentElement.className}</div>
        <button 
          onClick={toggleTheme}
          className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
        >
          Toggle Theme
        </button>
      </div>
    </div>
  );
};

export default DarkModeDebugger;
