// src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-sm w-full">
        <div className="text-6xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Check your email</h2>
        <p className="text-slate-400 text-sm mb-6">
          If <strong>{email}</strong> is registered, we've sent a reset link. Check your inbox (and spam folder).
        </p>
        <Link to="/login" className="btn-primary">Back to Login</Link>
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
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Forgot password?</h2>
          <p className="text-slate-400 text-sm mb-6">
            Enter your email address and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '⟳ Sending…' : 'Send Reset Link'}
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
