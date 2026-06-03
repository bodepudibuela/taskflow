// src/components/projects/CreateProjectModal.js
import React, { useState } from 'react';
import { projectsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
const ICONS  = ['📋','🚀','🎯','💡','🔧','🎨','📊','🌟','🔗','💼','🏆','⚡'];

export default function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', icon: '📋', is_private: false });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setLoading(true);
    try {
      const { data } = await projectsAPI.create(form);
      toast.success('Project created!');
      onCreated(data.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Create Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: form.color + '20' }}>
              {form.icon}
            </div>
            <div>
              <div className="font-medium" style={{ color: 'var(--text)' }}>{form.name || 'Project Name'}</div>
              <div className="text-xs text-slate-400">{form.is_private ? '🔒 Private' : '🌐 Public'}</div>
            </div>
          </div>

          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name} onChange={set('name')} required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What is this project about?"
              value={form.description} onChange={set('description')} />
          </div>

          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button key={ic} type="button"
                  onClick={() => setForm({ ...form, icon: ic })}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === ic ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Due Date (optional)</label>
            <input type="date" className="input" onChange={set('due_date')} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="rounded w-4 h-4"
              checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>🔒 Private project</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? '⟳ Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
