// src/components/tasks/TaskDetailModal.js
import React, { useState, useEffect, useRef } from 'react';
import { tasksAPI, usersAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES  = [{ v: 'todo', l: 'To Do' }, { v: 'in_progress', l: 'In Progress' }, { v: 'review', l: 'Review' }, { v: 'completed', l: 'Completed' }];
const PRIORITIES = [{ v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }, { v: 'urgent', l: 'Urgent' }];

const PRIORITY_COLORS = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', urgent: 'priority-urgent' };

export default function TaskDetailModal({ task: initialTask, members = [], onClose, onUpdate, onDelete }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comment, setComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [tab, setTab] = useState('comments');
  const { user } = useAuth();
  const { socket, joinTask, leaveTask } = useSocket();
  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadTaskDetail();
    joinTask(task.id);
    return () => leaveTask(task.id);
  }, [task.id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('comment:added', (c) => {
      if (c.task_id === task.id) setComments((prev) => [...prev, c]);
    });
    socket.on('user:typing', ({ userId, username }) => {
      if (userId !== user.id) setTypingUsers((prev) => [...new Set([...prev, username])]);
    });
    socket.on('user:stopped_typing', ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== userId));
    });
    return () => { socket.off('comment:added'); socket.off('user:typing'); socket.off('user:stopped_typing'); };
  }, [socket, task.id, user.id]);

  const loadTaskDetail = async () => {
    try {
      const { data } = await tasksAPI.get(task.id);
      setTask(data.data.task);
      setComments(data.data.comments);
      setAttachments(data.data.attachments);
    } catch {}
  };

  const handleUpdate = async (field, value) => {
    setSaving(true);
    try {
      const { data } = await tasksAPI.update(task.id, { [field]: value });
      setTask(data.data.task);
      onUpdate?.(data.data.task);
      toast.success('Updated!');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const mentions = [...comment.matchAll(/@(\w+)/g)].map(m => m[1]);
    try {
      await tasksAPI.addComment(task.id, { content: comment, mentions });
      setComment('');
      socket?.emit('typing:stop', { taskId: task.id });
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleCommentTyping = (e) => {
    setComment(e.target.value);
    socket?.emit('typing:start', { taskId: task.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('typing:stop', { taskId: task.id }), 2000);
  };

  const handleDeleteComment = async (commentId) => {
    await tasksAPI.deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success('Comment deleted');
  };

  const handleSaveEdit = async (commentId) => {
    await tasksAPI.updateComment(commentId, editContent);
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: editContent, is_edited: true } : c));
    setEditingComment(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await tasksAPI.uploadAttachment(task.id, fd);
      setAttachments((prev) => [data.data.attachment, ...prev]);
      toast.success('File uploaded!');
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 min-w-0">
            <input
              className="w-full text-lg font-bold bg-transparent border-none outline-none focus:ring-0 p-0"
              style={{ color: 'var(--text)' }}
              defaultValue={task.title}
              onBlur={(e) => { if (e.target.value !== task.title) handleUpdate('title', e.target.value); }}
            />
            <div className="text-xs text-slate-400 mt-0.5">
              Created by {task.creator_name} · {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400 animate-pulse">Saving…</span>}
            <button onClick={() => { if (window.confirm('Delete this task?')) { tasksAPI.delete(task.id); onDelete?.(task.id); onClose(); } }}
              className="btn-ghost text-red-400 hover:text-red-600">🗑</button>
            <button onClick={onClose} className="btn-ghost text-xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-0">
            {/* Left: main content */}
            <div className="col-span-2 p-6 border-r space-y-5" style={{ borderColor: 'var(--border)' }}>
              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none text-sm" rows={4}
                  defaultValue={task.description || ''}
                  placeholder="Add a description..."
                  onBlur={(e) => handleUpdate('description', e.target.value)} />
              </div>

              {/* Tabs */}
              <div>
                <div className="flex gap-1 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
                  {['comments', 'attachments'].map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`px-3 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
                        ${tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      {t === 'comments' ? `💬 Comments (${comments.length})` : `📎 Files (${attachments.length})`}
                    </button>
                  ))}
                </div>

                {tab === 'comments' && (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3 group">
                        <div className="avatar w-7 h-7 text-xs flex-shrink-0">
                          {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full" /> : c.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.full_name}</span>
                            <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            {c.is_edited && <span className="text-xs text-slate-300">(edited)</span>}
                          </div>
                          {editingComment === c.id ? (
                            <div>
                              <textarea className="input text-sm resize-none w-full" rows={3}
                                value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => handleSaveEdit(c.id)} className="btn-primary text-xs py-1">Save</button>
                                <button onClick={() => setEditingComment(null)} className="btn-secondary text-xs py-1">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                              {c.content.split(/(@\w+)/g).map((part, i) =>
                                part.startsWith('@')
                                  ? <span key={i} className="text-primary-600 font-medium">{part}</span>
                                  : part
                              )}
                            </p>
                          )}
                        </div>
                        {c.user_id === user.id && editingComment !== c.id && (
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button onClick={() => { setEditingComment(c.id); setEditContent(c.content); }} className="btn-ghost text-xs py-0.5">Edit</button>
                            <button onClick={() => handleDeleteComment(c.id)} className="btn-ghost text-xs text-red-400 py-0.5">Del</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {typingUsers.length > 0 && (
                      <p className="text-xs text-slate-400 animate-pulse">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                      </p>
                    )}

                    <form onSubmit={handleComment} className="flex gap-2 mt-3">
                      <div className="avatar w-7 h-7 text-xs flex-shrink-0">
                        {user?.full_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 relative">
                        <textarea className="input resize-none text-sm" rows={2}
                          placeholder="Write a comment… Use @username to mention"
                          value={comment} onChange={handleCommentTyping}
                          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleComment(e); }} />
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-400">⌘+Enter to post</span>
                          <button type="submit" disabled={!comment.trim() || posting} className="btn-primary text-xs py-1 px-3">
                            {posting ? '…' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {tab === 'attachments' && (
                  <div className="space-y-2">
                    <input type="file" ref={fileRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileRef.current?.click()} className="btn-secondary w-full justify-center">
                      📎 Upload File
                    </button>
                    {attachments.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-2xl">📄</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{a.original_name}</div>
                          <div className="text-xs text-slate-400">{(a.file_size / 1024).toFixed(1)} KB · {a.uploader_name}</div>
                        </div>
                        <a href={a.file_path} target="_blank" rel="noreferrer" className="btn-ghost text-xs">Download</a>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-6">No attachments yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: metadata */}
            <div className="p-4 space-y-4 text-sm">
              {/* Status */}
              <div>
                <label className="label text-xs">Status</label>
                <select className="input text-xs py-1"
                  value={task.status} onChange={(e) => handleUpdate('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="label text-xs">Priority</label>
                <select className="input text-xs py-1"
                  value={task.priority} onChange={(e) => handleUpdate('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="label text-xs">Assignee</label>
                <select className="input text-xs py-1"
                  value={task.assigned_to || ''}
                  onChange={(e) => handleUpdate('assigned_to', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="label text-xs">Due Date</label>
                <input type="date" className="input text-xs py-1"
                  value={task.due_date ? task.due_date.split('T')[0] : ''}
                  onChange={(e) => handleUpdate('due_date', e.target.value || null)} />
              </div>

              {/* Estimated hours */}
              <div>
                <label className="label text-xs">Estimated Hours</label>
                <input type="number" step="0.5" min="0" className="input text-xs py-1"
                  defaultValue={task.estimated_hours || ''}
                  placeholder="0"
                  onBlur={(e) => handleUpdate('estimated_hours', e.target.value || null)} />
              </div>

              {/* Tags */}
              <div>
                <label className="label text-xs">Tags (comma-separated)</label>
                <input className="input text-xs py-1"
                  defaultValue={Array.isArray(task.tags) ? task.tags.join(', ') : ''}
                  placeholder="design, frontend, ux"
                  onBlur={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    handleUpdate('tags', tags);
                  }} />
              </div>

              {task.completed_at && (
                <div className="pt-2 border-t text-xs text-slate-400" style={{ borderColor: 'var(--border)' }}>
                  ✅ Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
