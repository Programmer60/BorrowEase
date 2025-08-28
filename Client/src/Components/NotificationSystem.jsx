// Industrial-level notification system
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Notification context
const NotificationContext = createContext();

// Custom hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Toast component with enhanced styling
const Toast = ({ notification, onClose }) => {
  const { isDark } = useTheme();
  
  const icons = {
    [NOTIFICATION_TYPES.SUCCESS]: <CheckCircle className="w-5 h-5" />,
    [NOTIFICATION_TYPES.ERROR]: <XCircle className="w-5 h-5" />,
    [NOTIFICATION_TYPES.WARNING]: <AlertCircle className="w-5 h-5" />,
    [NOTIFICATION_TYPES.INFO]: <Info className="w-5 h-5" />
  };

  const getStyles = (type) => {
    const styles = {
      [NOTIFICATION_TYPES.SUCCESS]: {
        background: isDark ? 'bg-green-900/90 border-green-700' : 'bg-green-50 border-green-200',
        text: isDark ? 'text-green-200' : 'text-green-800',
        icon: 'text-green-500'
      },
      [NOTIFICATION_TYPES.ERROR]: {
        background: isDark ? 'bg-red-900/90 border-red-700' : 'bg-red-50 border-red-200',
        text: isDark ? 'text-red-200' : 'text-red-800',
        icon: 'text-red-500'
      },
      [NOTIFICATION_TYPES.WARNING]: {
        background: isDark ? 'bg-yellow-900/90 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
        text: isDark ? 'text-yellow-200' : 'text-yellow-800',
        icon: 'text-yellow-500'
      },
      [NOTIFICATION_TYPES.INFO]: {
        background: isDark ? 'bg-blue-900/90 border-blue-700' : 'bg-blue-50 border-blue-200',
        text: isDark ? 'text-blue-200' : 'text-blue-800',
        icon: 'text-blue-500'
      }
    };
    return styles[type] || styles[NOTIFICATION_TYPES.INFO];
  };

  const style = getStyles(notification.type);

  return (
    <div
      className={`
        fixed top-4 right-4 ${style.background} border rounded-lg p-4 shadow-lg 
        z-[9999] flex items-start max-w-sm min-w-80 backdrop-blur-sm
        transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
      `}
      role="alert"
      aria-live="polite"
    >
      <div className={`${style.icon} flex-shrink-0 mt-0.5`}>
        {icons[notification.type]}
      </div>
      
      <div className="ml-3 flex-1">
        {notification.title && (
          <h4 className={`text-sm font-semibold ${style.text} mb-1`}>
            {notification.title}
          </h4>
        )}
        <p className={`text-sm ${style.text}`}>
          {notification.message}
        </p>
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={`
              mt-2 text-sm font-medium underline ${style.text} 
              hover:no-underline focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-blue-500 rounded
            `}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onClose(notification.id)}
        className={`
          ml-4 flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
          transition-colors duration-200 focus:outline-none focus:ring-2 
          focus:ring-offset-2 focus:ring-blue-500 rounded
        `}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      autoClose: true,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto close if enabled
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      ...options
    });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed top-0 right-0 p-4 space-y-2 z-[9999] pointer-events-none">
        {notifications.map(notification => (
          <div key={notification.id} className="pointer-events-auto">
            <Toast
              notification={notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Higher-order component for easier integration
export const withNotifications = (Component) => {
  return function WrappedComponent(props) {
    return (
      <NotificationProvider>
        <Component {...props} />
      </NotificationProvider>
    );
  };
};

export default NotificationProvider;
