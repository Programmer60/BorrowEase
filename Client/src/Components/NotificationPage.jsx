// NotificationPage.jsx
import { useEffect, useState } from "react";
import API from "../api/api";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);

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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      {notifications.map((n) => (
        <div key={n._id} className={`p-4 mb-2 rounded ${n.read ? "bg-gray-100" : "bg-blue-100"}`}>
          <p>{n.message}</p>
          {n.link && <a href={n.link} className="text-blue-500 underline">Go to</a>}
        </div>
      ))}
    </div>
  );
}
