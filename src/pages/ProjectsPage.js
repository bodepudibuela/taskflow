// src/pages/ProjectsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import { projectsAPI } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data } = await projectsAPI.getAll();
      setProjects(data.data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter((p) => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AppShell title="Projects" onSearch={setSearch}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Projects</h2>
            <p className="text-slate-500 text-sm mt-0.5">{projects.length} total projects</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'active', 'on_hold', 'completed', 'archived'].map((f) => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors flex-shrink-0
                ${filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-3 w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📁</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {search ? 'Try a different search term' : 'Create your first project to get started'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                + Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const progress = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 block group">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: p.color + '20' }}>
                        {p.icon}
                      </span>
                      <span className={`badge ${STATUS_COLORS[p.status] || 'bg-slate-100'} capitalize`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {p.is_private && <span className="text-slate-400 text-sm">🔒</span>}
                  </div>

                  <h3 className="font-semibold mb-1 group-hover:text-primary-600 transition-colors"
                    style={{ color: 'var(--text)' }}>
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.description || 'No description'}</p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{p.completed_tasks || 0} / {p.task_count || 0} tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, background: p.color }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>👥 {p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                    {p.due_date && <span>📅 {format(new Date(p.due_date), 'MMM d')}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setProjects([p, ...projects]); setShowCreate(false); }}
        />
      )}
    </AppShell>
  );
}
