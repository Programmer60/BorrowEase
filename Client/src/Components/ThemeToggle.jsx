import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'button', className = '' }) => {
  const { theme, isDark, toggleTheme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  if (variant === 'simple') {
    return (
      <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all duration-300 ease-in-out
        ${isDark 
        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600' 
        : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-300'
        }
        border
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${isDark ? 'dark:focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300
          bg-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-600 dark:text-gray-300
          border border-gray-300 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
        "
      >
        {isDark ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
        </span>
      </button>

      {showDropdown && (
        <div className="
          absolute right-0 mt-2 w-48 py-2 z-50
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg dark:shadow-dark-lg
          animate-slide-up
        ">
          <ThemeOption
            icon={Sun}
            label="Light"
            description="Always light theme"
            isActive={theme === 'light'}
            onClick={() => {
              setLightTheme();
              setShowDropdown(false);
            }}
          />
          <ThemeOption
            icon={Moon}
            label="Dark"
            description="Always dark theme"
            isActive={theme === 'dark'}
            onClick={() => {
              setDarkTheme();
              setShowDropdown(false);
            }}
          />
          <ThemeOption
            icon={Monitor}
            label="System"
            description="Use system preference"
            isActive={!localStorage.getItem('borrowease-theme')}
            onClick={() => {
              setSystemTheme();
              setShowDropdown(false);
            }}
          />
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

const ThemeOption = ({ icon: Icon, label, description, isActive, onClick }) => (
  <button
    onClick={onClick}
    className="
      w-full flex items-center justify-between px-4 py-2 text-left
      hover:bg-gray-100 dark:hover:bg-gray-700
      text-gray-700 dark:text-gray-300
      transition-colors duration-200
    "
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
    {isActive && (
      <Check className="w-4 h-4 text-primary-500" />
    )}
  </button>
);

export default ThemeToggle;
