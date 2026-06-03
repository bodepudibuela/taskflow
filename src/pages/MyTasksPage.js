// src/pages/MyTasksPage.js
import React, { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { tasksAPI, projectsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { format, isPast, isToday, addDays } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = {
  low:    'priority-low',
  medium: 'priority-medium',
  high:   'priority-high',
  urgent: 'priority-urgent',
};
const STATUS_BADGE = {
  todo:        'status-todo',
  in_progress: 'status-in_progress',
  review:      'status-review',
  completed:   'status-completed',
};
const STATUS_LABELS = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', completed: 'Completed',
};

export default function MyTasksPage() {
  const { user }        = useAuth();
  const [tasks, setTasks]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter]           = useState('active');
  const [sortBy, setSortBy]           = useState('due_date');
  const [searchTerm, setSearchTerm]   = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: pd } = await projectsAPI.getAll();
      const allProjects  = pd.data.projects;
      setProjects(allProjects);

      // Fetch tasks from every project where assigned to me
      const allTasks = [];
      await Promise.all(
        allProjects.map(async (p) => {
          try {
            const { data: td } = await tasksAPI.getByProject(p.id, { assigned_to: user.id });
            td.data.tasks.forEach((t) => {
              allTasks.push({ ...t, project_name: p.name, project_color: p.color });
            });
          } catch {}
        })
      );
      setTasks(allTasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelectedTask((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  // Filter
  const now = new Date();
  const filtered = tasks
    .filter((t) => {
      const matchSearch = !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'active')    return t.status !== 'completed';
      if (filter === 'completed') return t.status === 'completed';
      if (filter === 'overdue')   return t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed';
      if (filter === 'today')     return t.due_date && isToday(new Date(t.due_date));
      if (filter === 'upcoming')  return t.due_date && new Date(t.due_date) <= addDays(now, 7) && new Date(t.due_date) >= now;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      }
      if (sortBy === 'priority') {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const stats = {
    total:     tasks.length,
    active:    tasks.filter((t) => t.status !== 'completed').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue:   tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length,
  };

  return (
    <AppShell title="My Tasks">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Tasks</h2>
          <p className="text-slate-400 text-sm mt-0.5">All tasks assigned to you across projects</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',     value: stats.total,     color: 'text-slate-600' },
            { label: 'Active',    value: stats.active,    color: 'text-blue-600'  },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
            { label: 'Overdue',   value: stats.overdue,   color: 'text-red-500'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <input
            className="input text-sm py-1.5 w-52"
            placeholder="🔍 Search tasks…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'active',    label: 'Active' },
              { id: 'today',     label: 'Today' },
              { id: 'upcoming',  label: 'Upcoming' },
              { id: 'overdue',   label: 'Overdue' },
              { id: 'completed', label: 'Done' },
              { id: 'all',       label: 'All' },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                  ${filter === f.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <select
            className="input text-xs py-1.5 w-36 ml-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}>
            <option value="due_date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="created">Sort: Created</option>
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">
              {filter === 'overdue' ? '🎉' : filter === 'completed' ? '📭' : '✅'}
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              {filter === 'overdue' ? 'No overdue tasks!' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
            </h3>
            <p className="text-slate-400 text-sm">
              {filter === 'overdue' ? 'Great job keeping up with deadlines.' : 'Tasks assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((task) => {
                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
                return (
                  <div key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">

                    {/* Completion indicator */}
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors
                      ${task.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-primary-400'}`}>
                      {task.status === 'completed' && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Project dot */}
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: task.project_color || '#6366f1' }} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}
                        style={task.status !== 'completed' ? { color: 'var(--text)' } : {}}>
                        {task.title}
                      </span>
                      <div className="text-xs text-slate-400 mt-0.5">{task.project_name}</div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${PRIORITY_BADGE[task.priority]} text-xs capitalize`}>
                        {task.priority}
                      </span>
                      <span className={`badge ${STATUS_BADGE[task.status]} text-xs`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {task.due_date && (
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                          {isOverdue ? '⚠️ ' : '📅 '}
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={[]}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}
    </AppShell>
  );
}
