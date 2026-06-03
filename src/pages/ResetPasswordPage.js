// src/pages/ResetPasswordPage.js
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token');
  const navigate        = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center">
        <div className="text-5xl mb-3">❌</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Invalid Reset Link</h2>
        <p className="text-slate-400 text-sm mb-4">This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="btn-primary">Request New Link</Link>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Password Reset!</h2>
        <p className="text-slate-400 text-sm">Redirecting to login…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg">T</div>
          <span className="text-primary-600 font-bold text-xl">TaskFlow</span>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Set new password</h2>
          <p className="text-slate-400 text-sm mb-6">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="Repeat new password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '⟳ Resetting…' : 'Reset Password'}
            </button>
          </form>

          <Link to="/login" className="block mt-4 text-center text-sm text-primary-600 hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
