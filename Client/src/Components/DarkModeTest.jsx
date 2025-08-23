// Simple test component to verify dark mode is working
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DarkModeTest = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className={`p-4 m-4 rounded-lg border-2 ${
      isDark 
        ? 'bg-gray-800 text-white border-gray-600' 
        : 'bg-white text-black border-gray-300'
    }`}>
      <h3 className="font-bold mb-2">Dark Mode Test</h3>
      <p>Current mode: {isDark ? 'DARK' : 'LIGHT'}</p>
      <p>Background should change when toggling</p>
      <button 
        onClick={toggleTheme}
        className={`mt-2 px-4 py-2 rounded ${
          isDark 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        Toggle Theme
      </button>
    </div>
  );
};

export default DarkModeTest;
