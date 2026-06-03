// src/components/tasks/KanbanBoard.js
import React, { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasksAPI } from '../../utils/api';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8', icon: '○' },
  { id: 'in_progress', label: 'In Progress',  color: '#3b82f6', icon: '◑' },
  { id: 'review',      label: 'Review',       color: '#8b5cf6', icon: '◐' },
  { id: 'completed',   label: 'Completed',    color: '#10b981', icon: '●' },
];

const PRIORITY_COLORS = {
  low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444'
};

function TaskCard({ task, onOpen, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onOpen(task); } }}
      className="task-card group select-none">
      {/* Priority stripe */}
      <div className="w-full h-0.5 rounded-full mb-2" style={{ background: PRIORITY_COLORS[task.priority] }} />

      <p className="text-sm font-medium mb-2 leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>{task.title}</p>

      {task.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[10px]">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              {isOverdue ? '⚠️' : '📅'} {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="text-xs text-slate-400">💬 {task.comment_count}</span>
          )}
          {task.attachment_count > 0 && (
            <span className="text-xs text-slate-400">📎 {task.attachment_count}</span>
          )}
        </div>

        {task.assignee_name && (
          <div className="avatar w-6 h-6 text-[10px] flex-shrink-0" title={task.assignee_name}>
            {task.assignee_avatar
              ? <img src={task.assignee_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              : task.assignee_name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ column, tasks, onOpen, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`kanban-col min-h-64 ${isOver ? 'ring-2 ring-primary-400' : ''}`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span style={{ color: column.color }} className="font-bold">{column.icon}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{column.label}</span>
          <span className="badge bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{tasks.length}</span>
        </div>
        <button onClick={() => onAddTask(column.id)}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-xl leading-none transition-colors">
          +
        </button>
      </div>

      {/* Tasks */}
      <div ref={setNodeRef} className="flex-1 px-2 pb-2 space-y-2 min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed text-slate-300 dark:text-slate-700 text-sm"
            style={{ borderColor: 'var(--border)' }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, setTasks, projectId, onOpenTask, onAddTask }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status)
    .sort((a, b) => a.position - b.position);

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find(t => t.id === active.id));
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeTask = tasks.find(t => t.id === active.id);
    const overIsColumn = COLUMNS.some(c => c.id === over.id);

    if (overIsColumn && activeTask.status !== over.id) {
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: over.id } : t));
    }
  };

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const movedTask = tasks.find(t => t.id === active.id);
    if (!movedTask) return;

    const overIsColumn = COLUMNS.some(c => c.id === over.id);
    const newStatus = overIsColumn ? over.id : (tasks.find(t => t.id === over.id)?.status || movedTask.status);

    // Build reorder payload
    const updatedTasks = tasks.map(t => t.id === active.id ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    // Persist positions
    const reorderPayload = COLUMNS.flatMap(col =>
      updatedTasks.filter(t => t.status === col.id).map((t, i) => ({ id: t.id, status: col.id, position: i }))
    );

    try {
      await tasksAPI.reorder(reorderPayload, projectId);
    } catch {
      toast.error('Failed to save task order');
    }
  }, [tasks, projectId, setTasks]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column key={col.id} column={col}
            tasks={getTasksByStatus(col.id)}
            onOpen={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="task-card drag-overlay w-72">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
