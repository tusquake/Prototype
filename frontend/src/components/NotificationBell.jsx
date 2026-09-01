import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api';
import styles from './Sidebar.module.css';

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

    window.addEventListener('sop-updated', fetchNotificationData);
    window.addEventListener('task-updated', fetchNotificationData);
    window.addEventListener('notification-updated', fetchNotificationData);

    return () => {
      eventSource.close();
      window.removeEventListener('sop-updated', fetchNotificationData);
      window.removeEventListener('task-updated', fetchNotificationData);
      window.removeEventListener('notification-updated', fetchNotificationData);
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

  async function handleMarkAllRead(e) {
    e.stopPropagation();
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className={styles.notifContainer} ref={popoverRef}>
      <button
        type="button"
        className={`${styles.notifBellBtn} ${showPopover ? styles.notifBellBtnActive : ''}`}
        onClick={() => setShowPopover(!showPopover)}
        title="Notifications"
      >
        <div className={styles.notifBellIconWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className={styles.notifBadgeDot}>{unreadCount}</span>
          )}
        </div>
        <span className={styles.notifBellLabel}>Notifications</span>
        {unreadCount > 0 && (
          <span className={styles.notifCountPill}>{unreadCount} unread</span>
        )}
      </button>

      {/* Notification Drawer / Popover */}
      {showPopover && (
        <div className={styles.notifPopover}>
          <div className={styles.notifHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={styles.notifTitle}>Notifications</span>
              {unreadCount > 0 && (
                <span className={styles.notifHeaderBadge}>{unreadCount} New</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {notifications.length === 0 ? (
              <div className={styles.notifEmpty}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>No notifications</span>
              </div>
            ) : (
              notifications.map(item => {
                const isUnread = !item.isRead;
                const isGreen = item.eventType?.includes('APPROVED');
                const isRed = item.eventType?.includes('REJECTED');
                const strokeColor = isGreen ? '#22c55e' : isRed ? '#ef4444' : '#38bdf8';
                const iconBg = isGreen ? 'rgba(34, 197, 94, 0.12)' : isRed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.1)';

                return (
                  <div
                    key={item.notificationId}
                    className={styles.notifItem}
                    style={{
                      background: isUnread ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                      borderLeft: isUnread ? '3px solid #38bdf8' : '3px solid transparent',
                    }}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div className={styles.notifItemIcon} style={{ background: iconBg }}>
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
                    <div className={styles.notifItemContent}>
                      <div className={styles.notifItemTitle} style={{ fontWeight: isUnread ? 700 : 500 }}>
                        {item.title}
                      </div>
                      <div className={styles.notifItemMeta} style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                        {item.message}
                      </div>
                      <div className={styles.notifItemAction} style={{ color: strokeColor, marginTop: 4 }}>
                        <span>Open {item.referenceEntityType || 'Item'} →</span>
                      </div>
                    </div>
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
