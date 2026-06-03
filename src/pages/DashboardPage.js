// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { dashboardAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { Link } from 'react-router-dom';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value ?? '—'}</div>
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const PriorityBadge = ({ p }) => {
  const cls = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', urgent: 'priority-urgent' };
  return <span className={`badge ${cls[p] || 'priority-medium'} capitalize`}>{p}</span>;
};

const StatusBadge = ({ s }) => {
  const cls = { todo: 'status-todo', in_progress: 'status-in_progress', review: 'status-review', completed: 'status-completed' };
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Done' };
  return <span className={`badge ${cls[s] || 'status-todo'}`}>{labels[s] || s}</span>;
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    dashboardAPI.get()
      .then(({ data: d }) => setData(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppShell title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-spin">⟳</div>
      </div>
    </AppShell>
  );

  const { stats, myTasks, recentActivity, teamStats, upcomingDeadlines, projectProgress } = data || {};

  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppShell title="Dashboard">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {timeOfDay()}, {user?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Here's what's happening across your projects today.
            </p>
          </div>
          <div className="text-sm text-slate-400">{format(new Date(), 'EEEE, MMMM d')}</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="📁" label="Total Projects" value={stats?.total_projects}
            color="bg-primary-100 dark:bg-primary-900/30" />
          <StatCard icon="⚡" label="Active Tasks" value={stats?.active_tasks}
            sub={`${stats?.todo_tasks || 0} to do · ${stats?.review_tasks || 0} in review`}
            color="bg-blue-100 dark:bg-blue-900/30" />
          <StatCard icon="✅" label="Completed" value={stats?.completed_tasks}
            color="bg-green-100 dark:bg-green-900/30" />
          <StatCard icon="⚠️" label="Overdue" value={stats?.overdue_tasks}
            color="bg-red-100 dark:bg-red-900/30" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Tasks */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>My Tasks</h3>
              <Link to="/my-tasks" className="text-sm text-primary-600 hover:underline">View all →</Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {(!myTasks || myTasks.length === 0) ? (
                <div className="py-10 text-center text-slate-400">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-sm">You're all caught up!</div>
                </div>
              ) : myTasks.map((t) => (
                <Link key={t.id} to={`/projects/${t.project_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.project_color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{t.title}</div>
                    <div className="text-xs text-slate-400 truncate">{t.project_name}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge p={t.priority} />
                    {t.due_date && (
                      <span className={`text-xs ${isPast(new Date(t.due_date)) ? 'text-red-500' : 'text-slate-400'}`}>
                        {format(new Date(t.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            {/* Upcoming deadlines */}
            {upcomingDeadlines?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  ⏰ Upcoming (7 days)
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {upcomingDeadlines.map((t) => (
                    <div key={t.id} className="px-4 py-2.5">
                      <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-orange-500 font-medium">{format(new Date(t.due_date), 'MMM d')}</span>
                        <span className="text-xs text-slate-400">· {t.project_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team online */}
            {teamStats?.length > 0 && (
              <div className="card p-4">
                <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>👥 Team</h4>
                <div className="space-y-2">
                  {teamStats.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="relative">
                        <div className="avatar w-7 h-7 text-xs">
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            : m.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        {m.is_online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-slate-800" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{m.full_name}</div>
                        <div className="text-xs text-slate-400">{m.completed_tasks || 0} done</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project progress */}
        {projectProgress?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              📊 Project Progress
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-x md:divide-y-0" style={{ borderColor: 'var(--border)' }}>
              {projectProgress.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: p.color + '20' }}>
                      {p.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{p.name}</div>
                      <div className="text-xs text-slate-400">{p.total_tasks} tasks</div>
                    </div>
                    <span className="ml-auto text-sm font-bold" style={{ color: p.color }}>{p.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${p.progress || 0}%`, background: p.color }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentActivity?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              📋 Recent Activity
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recentActivity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="avatar w-7 h-7 text-xs flex-shrink-0">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      : a.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{a.description}</p>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
