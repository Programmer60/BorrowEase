import React from 'react';
import { Sun, Moon, Monitor, Palette, Zap, Shield, Smartphone, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

const DarkModeDemo = () => {
  const { isDark } = useTheme();

  const features = [
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Beautiful Design",
      description: "Carefully crafted color palette that works perfectly in both light and dark modes."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smooth Transitions",
      description: "Seamless animations when switching between themes for a delightful user experience."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Accessibility Focused",
      description: "High contrast ratios and proper focus states ensure excellent accessibility."
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Battery Friendly",
      description: "Dark mode saves battery life on OLED devices and reduces eye strain."
    }
  ];

  const themeShowcase = [
    {
      name: "Cards & Components",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Sample Card</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              This card demonstrates how content adapts to different themes.
            </p>
            <div className="flex space-x-2">
              <span className="badge-success">Success</span>
              <span className="badge-warning">Warning</span>
              <span className="badge-danger">Error</span>
            </div>
          </div>
          
          <div className="card-hover p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Interactive Card</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Hover over this card to see the elevation effect.
            </p>
            <button className="btn-primary">
              Primary Action
            </button>
          </div>
        </div>
      )
    },
    {
      name: "Forms & Inputs",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sample Input
            </label>
            <input 
              type="text" 
              placeholder="Enter some text..."
              className="input-field"
              defaultValue="This input adapts to the theme"
            />
          </div>
          
          <div className="flex space-x-2">
            <button className="btn-primary">Primary</button>
            <button className="btn-secondary">Secondary</button>
            <button className="btn-outline">Outline</button>
          </div>
        </div>
      )
    },
    {
      name: "Data Tables",
      content: (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">John Doe</td>
                <td className="px-4 py-3"><span className="badge-success">Active</span></td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">$1,250</td>
              </tr>
              <tr className="table-row">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">Jane Smith</td>
                <td className="px-4 py-3"><span className="badge-warning">Pending</span></td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">$750</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 dark:from-blue-800 dark:to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {isDark ? (
                <Moon className="w-16 h-16 text-blue-200" />
              ) : (
                <Sun className="w-16 h-16 text-yellow-300" />
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {isDark ? 'Dark Mode' : 'Light Mode'} Activated
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Experience BorrowEase with our professionally designed dark mode implementation. 
              Switch themes seamlessly and enjoy the perfect visual experience.
            </p>
            
            <div className="flex justify-center mb-8">
              <ThemeToggle className="text-white" />
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 text-white">
                <Users className="w-5 h-5 inline mr-2" />
                Industry Standard
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 text-white">
                <Zap className="w-5 h-5 inline mr-2" />
                Smooth Transitions
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 text-white">
                <Shield className="w-5 h-5 inline mr-2" />
                Accessible Design
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Why Our Dark Mode Rocks
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Built with modern design principles and accessibility in mind
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="card-hover p-6 text-center">
              <div className="text-blue-600 dark:text-blue-400 mb-4 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Theme Showcase */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Component Showcase
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              See how different UI elements adapt to the current theme
            </p>
          </div>

          {themeShowcase.map((section, index) => (
            <div key={index} className="card p-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                {section.name}
              </h3>
              {section.content}
            </div>
          ))}
        </div>

        {/* Implementation Details */}
        <div className="mt-16 card p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Implementation Features
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                🎨 Design System
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Custom color palette with dark variants</li>
                <li>• Consistent shadow system for depth</li>
                <li>• Proper contrast ratios (WCAG compliant)</li>
                <li>• Smooth transitions between themes</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                ⚡ Technical Features
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Context-based theme management</li>
                <li>• Local storage persistence</li>
                <li>• System preference detection</li>
                <li>• Tailwind CSS v4 powered</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              🚀 Current Theme: <span className="capitalize">{isDark ? 'Dark' : 'Light'}</span>
            </p>
            <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
              Theme preference is automatically saved and will persist across sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarkModeDemo;
