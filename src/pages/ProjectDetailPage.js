// src/pages/ProjectDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import InviteMemberModal from '../components/projects/InviteMemberModal';
import { projectsAPI, tasksAPI } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-slate-100 text-slate-500',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { socket, joinProject, leaveProject } = useSocket();

  const [project, setProject]           = useState(null);
  const [members, setMembers]           = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [showInvite, setShowInvite]     = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [activeTab, setActiveTab]       = useState('board');
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // ── Load ──────────────────────────────────────────────────
  const loadProject = useCallback(async () => {
    try {
      const { data } = await projectsAPI.get(projectId);
      setProject(data.data.project);
      setMembers(data.data.members);
      setTasks(data.data.tasks);
    } catch (err) {
      toast.error('Project not found or access denied');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    loadProject();
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId]);

  // ── Socket listeners ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('task:created', (task) => {
      setTasks((prev) => {
        if (prev.find((t) => t.id === task.id)) return prev;
        return [...prev, task];
      });
    });

    socket.on('task:updated', (updated) => {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTask?.id === updated.id) setSelectedTask(updated);
    });

    socket.on('task:deleted', ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    });

    socket.on('tasks:reordered', ({ tasks: reordered }) => {
      setTasks((prev) =>
        prev.map((t) => {
          const r = reordered.find((x) => x.id === t.id);
          return r ? { ...t, status: r.status, position: r.position } : t;
        })
      );
    });

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('tasks:reordered');
    };
  }, [socket, selectedTask]);

  // ── Handlers ──────────────────────────────────────────────
  const handleAddTask = (status = 'todo') => {
    setDefaultStatus(status);
    setShowCreate(true);
  };

  const handleTaskCreated = (task) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  // ── Filtered tasks ─────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    const matchSearch   = !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchAssignee = !filterAssignee || t.assigned_to === filterAssignee;
    return matchSearch && matchPriority && matchAssignee;
  });

  const taskStats = {
    total:       tasks.length,
    completed:   tasks.filter((t) => t.status === 'completed').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue:     tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
  };
  const progress = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) return (
    <AppShell title="Loading…">
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64" />
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-72 h-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );

  return (
    <AppShell title={project?.name || 'Project'}>
      <div className="flex flex-col h-full">

        {/* ── Project Header ── */}
        <div className="px-6 py-4 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: (project?.color || '#6366f1') + '20' }}>
                {project?.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate" style={{ color: 'var(--text)' }}>{project?.name}</h1>
                  <span className={`badge ${STATUS_BADGE[project?.status] || ''} capitalize text-xs`}>
                    {project?.status?.replace('_', ' ')}
                  </span>
                  {project?.is_private && <span className="text-slate-400 text-sm">🔒</span>}
                </div>
                {project?.description && (
                  <p className="text-sm text-slate-400 truncate max-w-lg mt-0.5">{project.description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Member avatars */}
              <div className="flex -space-x-2 mr-2">
                {members.slice(0, 5).map((m) => (
                  <div key={m.id} className="avatar w-7 h-7 text-xs ring-2 ring-white dark:ring-slate-900" title={m.full_name}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      : m.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="avatar w-7 h-7 text-xs ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-500">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <button onClick={() => setShowInvite(true)} className="btn-secondary text-xs py-1.5">
                + Invite
              </button>
              <button onClick={handleAddTask} className="btn-primary text-xs py-1.5">
                + Task
              </button>
              {project?.user_role === 'owner' && (
                <button onClick={handleDeleteProject} className="btn-ghost text-red-400 hover:text-red-600 text-sm">
                  🗑
                </button>
              )}
            </div>
          </div>

          {/* Progress bar + stats */}
          <div className="mt-4 flex items-center gap-6">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: project?.color || '#6366f1' }} />
              </div>
            </div>
            <div className="flex gap-5 text-xs text-slate-500">
              <span>📋 {taskStats.total} tasks</span>
              <span className="text-blue-500">⚡ {taskStats.in_progress} active</span>
              <span className="text-green-500">✅ {taskStats.completed} done</span>
              {taskStats.overdue > 0 && <span className="text-red-500">⚠️ {taskStats.overdue} overdue</span>}
              {project?.due_date && <span>📅 Due {format(new Date(project.due_date), 'MMM d, yyyy')}</span>}
            </div>
          </div>

          {/* Tabs + Filters */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1">
              {[
                { id: 'board',    icon: '⊞', label: 'Board' },
                { id: 'list',     icon: '☰', label: 'List' },
                { id: 'members',  icon: '👥', label: 'Members' },
                { id: 'activity', icon: '📋', label: 'Activity' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            {(activeTab === 'board' || activeTab === 'list') && (
              <div className="flex items-center gap-2">
                <input className="input text-xs py-1 w-40" placeholder="🔍 Search tasks…"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="input text-xs py-1 w-28" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="">All Priority</option>
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <select className="input text-xs py-1 w-32" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value="">All Members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-hidden">

          {/* Board */}
          {activeTab === 'board' && (
            <div className="h-full overflow-x-auto p-6">
              <KanbanBoard
                tasks={filteredTasks}
                setTasks={setTasks}
                projectId={projectId}
                onOpenTask={setSelectedTask}
                onAddTask={handleAddTask}
              />
            </div>
          )}

          {/* List view */}
          {activeTab === 'list' && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {filteredTasks.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-slate-400">No tasks found</td></tr>
                    ) : filteredTasks.map((t) => (
                      <tr key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium" style={{ color: 'var(--text)' }}>{t.title}</span>
                          {t.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge status-${t.status} text-xs capitalize`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge priority-${t.priority} text-xs capitalize`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          {t.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <div className="avatar w-6 h-6 text-xs">
                                {t.assignee_avatar
                                  ? <img src={t.assignee_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                  : t.assignee_name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs">{t.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.due_date ? (
                            <span className={`text-xs ${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                              {format(new Date(t.due_date), 'MMM d, yyyy')}
                            </span>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Members tab */}
          {activeTab === 'members' && (
            <div className="p-6 overflow-y-auto h-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                  Team Members ({members.length})
                </h3>
                <button onClick={() => setShowInvite(true)} className="btn-primary text-sm">+ Invite Member</button>
              </div>
              <div className="card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative">
                      <div className="avatar w-9 h-9 text-sm">
                        {m.avatar_url
                          ? <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          : m.full_name?.slice(0, 2).toUpperCase()}
                      </div>
                      {m.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.full_name}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs capitalize ${m.role === 'owner' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {m.role}
                      </span>
                      {m.role !== 'owner' && project?.user_role === 'owner' && (
                        <button onClick={() => handleRemoveMember(m.id)}
                          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <ActivityTab projectId={projectId} />
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          projectId={projectId}
          members={members}
          defaultStatus={defaultStatus}
          onClose={() => setShowCreate(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {showInvite && (
        <InviteMemberModal
          projectId={projectId}
          onClose={() => setShowInvite(false)}
          onInvited={(member) => setMembers((prev) => [...prev, member])}
        />
      )}
    </AppShell>
  );
}

// ── Activity sub-component ────────────────────────────────────
function ActivityTab({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.getActivity(projectId, 30)
      .then(({ data }) => setActivities(data.data.activities))
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><span className="text-3xl animate-spin">⟳</span></div>;

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Activity Log</h3>
      <div className="space-y-1">
        {activities.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No activity yet</p>
        ) : activities.map((a, idx) => (
          <div key={a.id} className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div className="avatar w-7 h-7 text-xs flex-shrink-0 mt-0.5">
              {a.avatar_url
                ? <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                : a.full_name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: 'var(--text)' }}>{a.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// tiny helper — imported via date-fns already in the page scope
function formatDistanceToNow(date, opts) {
  try {
    const { formatDistanceToNow: fn } = require('date-fns');
    return fn(date, opts);
  } catch { return ''; }
}
