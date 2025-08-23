// NotificationPage.jsx
import { useEffect, useState } from "react";
import API from "../api/api";
import { useTheme } from "../contexts/ThemeContext";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const { isDark } = useTheme();

  useEffect(() => {
    const getNotifications = async () => {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    };
    getNotifications();
  }, []);

  const markRead = async (id) => {
    await API.patch(`/notifications/${id}/read`);
    setNotifications(notifications.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };


  return (
    <div className={`p-6 max-w-3xl mx-auto min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <h1 className={`text-2xl font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h1>
      {notifications.length === 0 ? (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No notifications yet</p>
        </div>
      ) : (
        notifications.map((n) => (
          <div 
            key={n._id} 
            className={`p-4 mb-2 rounded-lg shadow-sm border transition-colors ${
              n.read 
                ? isDark 
                  ? "bg-gray-800 border-gray-700 text-gray-300" 
                  : "bg-gray-100 border-gray-200 text-gray-700"
                : isDark 
                  ? "bg-blue-900/30 border-blue-700 text-blue-200" 
                  : "bg-blue-100 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className={isDark ? 'text-gray-200' : 'text-gray-800'}>{n.message}</p>
                {n.link && (
                  <a 
                    href={n.link} 
                    className={`underline transition-colors ${
                      isDark 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-500 hover:text-blue-600'
                    }`}
                  >
                    Go to
                  </a>
                )}
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n._id)}
                  className={`ml-4 px-3 py-1 text-sm rounded-md transition-colors ${
                    isDark 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
