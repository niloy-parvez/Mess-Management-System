import React, { useEffect, useState } from "react";
import { Card, Button, Spinner } from "../components/common/Components";
import { notificationService } from "../services/notificationService";
import { Notification } from "../types";

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    await notificationService.markAsRead(id);
    await loadNotifications();
  };

  const deleteNotification = async (id: string) => {
    await notificationService.deleteNotification(id);
    await loadNotifications();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Card className="text-red-600">{error}</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500">Unread and recent system alerts.</p>
        </div>
        <Button variant="secondary" onClick={() => notificationService.markAllAsRead().then(loadNotifications)}>
          Mark All as Read
        </Button>
      </div>

      <Card>
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((item) => (
              <div key={item.id} className="border rounded p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.message}</p>
                    <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {!item.is_read && (
                      <Button variant="secondary" onClick={() => markRead(item.id)}>
                        Read
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => deleteNotification(item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No notifications found.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsPage;
