// src/components/layout/AppShell.js
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { projectsAPI } from '../../utils/api';
import CreateProjectModal from '../projects/CreateProjectModal';

export default function AppShell({ children, title = 'TaskFlow', onSearch }) {
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    projectsAPI.getAll()
      .then(({ data }) => setProjects(data.data.projects))
      .catch(() => {});
  }, []);

  const handleProjectCreated = (project) => {
    setProjects((prev) => [project, ...prev]);
    setShowCreate(false);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        projects={projects}
        onNewProject={() => setShowCreate(true)}
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
