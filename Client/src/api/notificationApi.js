import API from "./api";

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await API.patch(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to mark notification as read');
  }
}