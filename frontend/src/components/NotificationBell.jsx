import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/api';

export default function NotificationBell({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);

  const userId = currentUser?.id;

  async function fetchNotificationData() {
    if (!userId) return;
    try {
      const [list, count] = await Promise.all([
        getUserNotifications(userId).catch(() => []),
        getUnreadNotificationCount(userId).catch(() => 0),
      ]);
      setNotifications(list || []);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }

  useEffect(() => {
    fetchNotificationData();

    if (!userId) return;

    // Connect to Real-Time Server-Sent Events (SSE) Stream
    const sseUrl = `/finsop/v1/notifications/stream?userId=${encodeURIComponent(userId)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('NOTIFICATION', (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications(prev => [newNotif, ...prev.filter(n => n.notificationId !== newNotif.notificationId)]);
        setUnreadCount(prev => prev + 1);
      } catch (err) {
        console.error('Failed to parse SSE notification:', err);
      }
    });

    // Listen for local mock notifications dispatched from api.js (when backend SSE is unavailable)
    function handleAddNotification(event) {
      const detail = event?.detail || {};
      // Inject for all users in mock mode (or only if recipientUserId matches)
      const notif = {
        notificationId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: detail.title || 'SOP Update',
        message: detail.message || '',
        eventType: detail.eventType || 'SOP_SUBMITTED',
        referenceEntityType: detail.referenceEntityType || 'SOP',
        referenceEntityId: detail.referenceEntityId || '',
        isRead: false,
        timestamp: detail.timestamp || new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    }

    window.addEventListener('sop-updated', fetchNotificationData);
    window.addEventListener('task-updated', fetchNotificationData);
    window.addEventListener('notification-updated', fetchNotificationData);
    window.addEventListener('add-notification', handleAddNotification);

    return () => {
      eventSource.close();
      window.removeEventListener('sop-updated', fetchNotificationData);
      window.removeEventListener('task-updated', fetchNotificationData);
      window.removeEventListener('notification-updated', fetchNotificationData);
      window.removeEventListener('add-notification', handleAddNotification);
    };
  }, [userId]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleNotificationClick(item) {
    setShowPopover(false);

    // 1. Mark notification as read via API if unread
    if (!item.isRead) {
      await markNotificationAsRead(item.notificationId);
      setNotifications(prev =>
        prev.map(n => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // 2. Navigate and open detail view
    const isSop = item.referenceEntityType === 'SOP';
    const isTask = item.referenceEntityType === 'TASK';
    const refId = item.referenceEntityId;

    if (isSop) {
      const isReview = item.eventType === 'SOP_SUBMITTED' || item.eventType === 'SOP_APPROVAL';
      const isDraft = item.eventType === 'SOP_ASSIGNED' || item.eventType === 'SOP_REJECTED';

      let queryParam = 'sopId';
      if (isReview) queryParam = 'reviewSopCode';
      else if (isDraft) queryParam = 'draftSopCode';
      else queryParam = 'viewSopCode';

      const eventName = isReview ? 'open-sop-review' : isDraft ? 'open-sop-draft' : 'open-sop-view';
      window.dispatchEvent(new CustomEvent(eventName, { detail: { sopId: refId, code: refId, id: refId } }));

      navigate(`/sops?${queryParam}=${encodeURIComponent(refId)}`);
    } else if (isTask) {
      window.dispatchEvent(new CustomEvent('open-task-action', { detail: { taskId: refId, id: refId } }));
      navigate(`/tasks?openTaskId=${encodeURIComponent(refId)}`);
    }
  }

  async function handleDismissNotification(e, item) {
    e.stopPropagation(); // Prevent triggering full notification item click
    if (!item.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    // Delete notification permanently from backend & local UI state upon user dismissal
    deleteNotification(item.notificationId).catch(() => null);
    setNotifications(prev => prev.filter(n => n.notificationId !== item.notificationId));
  }

  async function handleMarkAllRead(e) {
    e.stopPropagation();
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-all ${showPopover
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
          }`}
        onClick={() => setShowPopover(!showPopover)}
        title="Notifications"
      >
        <div className="relative flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -right-1.25 -top-1 flex h-3.75 w-3.75 items-center justify-center rounded-full border-[1.5px] border-[#091124] bg-blue-600 text-[9.5px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-sky-500/12 px-1.75 py-0.5 text-[10.5px] font-semibold text-sky-400">
            {unreadCount} unread
          </span>
        )}
      </button>

      {/* Clean White Notification Drawer / Popover */}
      {showPopover && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-[100] w-[280px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_12px_30px_-5px_rgba(0,0,0,0.15),0_4px_10px_-2px_rgba(0,0,0,0.05)] animate-[fadeInNotif_0.15s_ease-out]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-sky-600 px-1.75 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="border-none bg-transparent text-[11px] font-semibold text-sky-600 cursor-pointer hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[260px] overflow-y-auto bg-white p-1.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 bg-white px-3.5 py-6 text-center text-xs text-slate-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>No new notifications</span>
              </div>
            ) : (
              notifications.map(item => {
                const isUnread = !item.isRead;
                const isGreen = item.eventType?.includes('APPROVED');
                const isRed = item.eventType?.includes('REJECTED');

                const strokeColor = isGreen ? '#16a34a' : isRed ? '#dc2626' : '#0284c7';
                const iconBgClass = isGreen ? 'bg-green-600/10' : isRed ? 'bg-red-600/10' : 'bg-sky-600/10';
                const actionColorClass = isGreen ? 'text-green-600 hover:text-green-500' : isRed ? 'text-red-600 hover:text-red-500' : 'text-sky-600 hover:text-blue-400';

                return (
                  <div
                    key={item.notificationId}
                    className={`group relative flex gap-2.5 rounded-lg border-b border-slate-100 p-2.5 transition-all cursor-pointer hover:bg-slate-50 ${isUnread
                        ? 'border-l-[3px] border-l-sky-600 bg-sky-50/50'
                        : 'border-l-[3px] border-l-transparent bg-white'
                      }`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconBgClass}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        {isGreen ? (
                          <polyline points="9 15 11 17 15 11" />
                        ) : (
                          <line x1="12" y1="18" x2="12" y2="12" />
                        )}
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1 pr-4.5">
                      <div className={`mb-0.5 text-xs text-slate-900 leading-snug ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                        {item.title}
                      </div>
                      <div className="mb-1 text-[11px] text-slate-500">
                        {item.message}
                      </div>
                      <div className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${actionColorClass}`}>
                        <span>Open {item.referenceEntityType || 'Item'} →</span>
                      </div>
                    </div>

                    {/* Explicit Dismiss / Cross (X) Button */}
                    <button
                      type="button"
                      title="Dismiss notification"
                      className="absolute right-2 top-2 flex rounded p-1 transition-colors hover:bg-slate-200"
                      onClick={(e) => handleDismissNotification(e, item)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
