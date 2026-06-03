// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to TaskFlow 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg">T</div>
          <span className="text-primary-600 font-bold text-xl">TaskFlow</span>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create account</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Join TaskFlow and start managing projects.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="John Doe" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="john_doe" value={form.username} onChange={set('username')} required minLength={3} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="john@company.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? '⟳ Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


// src/pages/ForgotPasswordPage.js — inline as named export via module trick
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { authAPI } = require('../utils/api');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const api = require('../utils/api').default;
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📬</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-slate-500 mb-6">If that email exists, we sent a password reset link. Check your inbox.</p>
        <Link to="/login" className="btn-primary">Back to login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Forgot password?</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Enter your email and we'll send a reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '⟳ Sending...' : 'Send reset link'}
            </button>
          </form>
          <Link to="/login" className="block mt-4 text-center text-sm text-primary-600 hover:underline">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
