// src/components/layout/Sidebar.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/projects',  icon: '📁', label: 'Projects'  },
  { to: '/my-tasks',  icon: '✅', label: 'My Tasks'  },
  { to: '/team',      icon: '👥', label: 'Team'      },
  { to: '/settings',  icon: '⚙️', label: 'Settings'  },
];

export default function Sidebar({ projects = [], onNewProject, collapsed, onCollapse }) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <aside className={`flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">T</div>
        {!collapsed && <span className="font-bold text-lg text-primary-600">TaskFlow</span>}
        <button onClick={onCollapse} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <span className="text-lg">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Projects section */}
        {!collapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Projects</span>
              <button onClick={onNewProject}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-sm">
                +
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.slice(0, 8).map((p) => (
                <NavLink key={p.id} to={`/projects/${p.id}`}
                  className={({ isActive }) => `sidebar-item text-xs ${isActive ? 'active' : ''}`}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-1 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleTheme} className="sidebar-item w-full">
          <span>{isDark ? '☀️' : '🌙'}</span>
          {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button onClick={() => { logout(); navigate('/login'); }} className="sidebar-item w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>

        {/* User */}
        <NavLink to="/settings/profile" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-2">
          <div className="avatar w-8 h-8 text-sm flex-shrink-0">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              : initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.full_name}</div>
              <div className="text-xs text-slate-400 truncate">{user?.role}</div>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
