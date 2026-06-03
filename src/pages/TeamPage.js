// src/pages/TeamPage.js
import React, { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { usersAPI } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const { onlineUsers }       = useSocket();

  useEffect(() => {
    usersAPI.getAll()
      .then(({ data }) => setUsers(data.data.users))
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false));
  }, []);

  const onlineIds = new Set(onlineUsers.map((u) => u.id));

  const filtered = users.filter(
    (u) =>
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Team">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Team Members</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {onlineUsers.length} online · {users.length} total
            </p>
          </div>
          <input
            className="input text-sm w-52"
            placeholder="🔍 Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse flex gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-2">👥</div>
            <p>No members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((u) => {
              const isOnline = onlineIds.has(u.id) || u.is_online;
              return (
                <div key={u.id} className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="relative flex-shrink-0">
                    <div className="avatar w-12 h-12 text-base">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        : u.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800
                      ${isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{u.full_name}</span>
                      <span className={`badge text-xs capitalize ${u.role === 'admin' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">@{u.username}</div>
                    <div className="text-xs text-slate-400 truncate">{u.email}</div>
                    {u.bio && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{u.bio}</div>}
                    <div className="text-xs mt-2">
                      {isOnline
                        ? <span className="text-green-500 font-medium">● Online</span>
                        : <span className="text-slate-400">
                            Last seen {u.last_seen ? formatDistanceToNow(new Date(u.last_seen), { addSuffix: true }) : 'never'}
                          </span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
