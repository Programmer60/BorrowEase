import { useEffect, useState, useRef } from "react";
import API from "../api/api";
import { Bell } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

// Custom bell ringing animation styles
const bellStyles = `
  @keyframes bellRing {
    0%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(15deg); }
    20% { transform: rotate(-10deg); }
    30% { transform: rotate(15deg); }
    40% { transform: rotate(-10deg); }
    50% { transform: rotate(10deg); }
    60% { transform: rotate(-5deg); }
    70% { transform: rotate(5deg); }
    80% { transform: rotate(0deg); }
  }
  
  .bell-ring {
    animation: bellRing 0.8s ease-in-out;
  }
`;

// Inject styles into head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = bellStyles;
  if (!document.head.querySelector('style[data-bell-animation]')) {
    styleElement.setAttribute('data-bell-animation', 'true');
    document.head.appendChild(styleElement);
  }
}


export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const bellRef = useRef(null);
  const prevNotificationCount = useRef(0);
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await API.get("/notifications");
        const newNotifications = res.data;
        
        // Check if there are new notifications
        const currentUnreadCount = newNotifications.filter(n => !n.read).length;
        if (prevNotificationCount.current > 0 && currentUnreadCount > prevNotificationCount.current) {
          // Trigger bell animation for new notifications
          setIsRinging(true);
          setTimeout(() => setIsRinging(false), 1000);
        }
        
        setNotifications(newNotifications);
        prevNotificationCount.current = currentUnreadCount;
      } catch (err) {
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Poll for new notifications every 3 seconds
    const interval = setInterval(fetchData, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Mark all as read in backend
  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n =>
          API.patch(`/notifications/${n._id}/read`)
        )
      );
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      setError("Failed to mark notifications as read");
    }
  };

  // Handle bell click
  const handleClick = () => {
    setDropdownOpen(!dropdownOpen);
    if (!dropdownOpen) markAllAsRead();
  };
  // Close dropdown on escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && dropdownOpen) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdownOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={bellRef}>
      <button 
        className={`relative cursor-pointer transition-transform duration-200 ${
          isRinging ? 'bell-ring' : ''
        }`} 
        onClick={handleClick}
      >
        <Bell className={`w-6 h-6 text-amber-300 stroke-amber-300 fill-amber-200 transition-all duration-300 ${
          unreadCount > 0 ? 'drop-shadow-lg filter brightness-110' : ''
        }`} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center transition-all duration-300 ${
            isRinging ? 'animate-ping scale-110' : 'animate-pulse'
          }`}>
            {unreadCount}
          </span>
        )}
      </button>
      {dropdownOpen && (
        <div className={`absolute right-0 mt-2 w-80 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {loading ? (
            <div className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
          ) : error ? (
            <div className={`p-4 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{error}</div>
          ) : notifications.length === 0 ? (
            <div className={`p-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No notifications</div>
          ) : (
            notifications.map(n => (
              <div 
                key={n._id} 
                className={`p-4 border-b last:border-b-0 transition-colors ${
                  isDark 
                    ? `border-gray-700 ${n.read ? 'bg-gray-800' : 'bg-gray-700/50'}` 
                    : `border-gray-100 ${n.read ? 'bg-gray-100' : 'bg-white'}`
                }`}
              >
                <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                  {n.title || "Notification"}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {n.message || n.text || "No details"}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
