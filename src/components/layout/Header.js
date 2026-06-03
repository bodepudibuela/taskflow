// src/components/layout/Header.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../utils/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Header({ title, onSearch }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnread((n) => n + 1);
      toast(notif.title, { icon: '🔔' });
    });
    return () => socket.off('notification:new');
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getAll();
      setNotifications(data.data.notifications);
      setUnread(data.data.unread_count);
    } catch {}
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const NOTIF_ICONS = {
    task_assigned: '📋', comment_added: '💬', mention: '🔔',
    project_invite: '📩', task_updated: '✏️', member_joined: '👤', deadline_reminder: '⏰',
  };

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      {/* Title */}
      <h1 className="text-lg font-semibold flex-shrink-0" style={{ color: 'var(--text)' }}>{title}</h1>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input className="input pl-9 py-1.5 text-sm" placeholder="Search tasks, projects..."
            value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 rounded-xl shadow-xl z-50 border overflow-hidden animate-fade-in"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No notifications yet</div>
                ) : notifications.map((n) => (
                  <div key={n.id}
                    className={`px-4 py-3 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                    onClick={async () => {
                      await notificationsAPI.markRead(n.id);
                      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
                      setUnread((u) => Math.max(0, u - (n.is_read ? 0 : 1)));
                      if (n.data?.projectId) navigate(`/projects/${n.data.projectId}`);
                      setShowNotifs(false);
                    }}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">{NOTIF_ICONS[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
