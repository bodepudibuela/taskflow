// src/pages/SettingsPage.js
import React, { useState, useRef } from 'react';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser }    = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const [tab, setTab]           = useState('profile');
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    username:  user?.username  || '',
    bio:       user?.bio       || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarPreview,  setAvatarPreview]  = useState(null);
  const fileRef = useRef(null);
  const avatarFile = useRef(null);

  const setPF = (k) => (e) => setProfileForm({ ...profileForm, [k]: e.target.value });
  const setPW = (k) => (e) => setPasswordForm({ ...passwordForm, [k]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    avatarFile.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append('full_name', profileForm.full_name);
      fd.append('username',  profileForm.username);
      fd.append('bio',       profileForm.bio);
      if (avatarFile.current) fd.append('avatar', avatarFile.current);

      const { data } = await usersAPI.updateProfile(fd);
      updateUser(data.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await usersAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password:     passwordForm.new_password,
      });
      toast.success('Password changed!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { id: 'profile',   icon: '👤', label: 'Profile' },
    { id: 'password',  icon: '🔒', label: 'Password' },
    { id: 'appearance',icon: '🎨', label: 'Appearance' },
  ];

  return (
    <AppShell title="Settings">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h2>
          <p className="text-slate-400 text-sm">Manage your account and preferences.</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-44 flex-shrink-0 space-y-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`sidebar-item w-full ${tab === t.id ? 'active' : ''}`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* Profile */}
            {tab === 'profile' && (
              <div className="card p-6">
                <h3 className="font-semibold text-lg mb-5" style={{ color: 'var(--text)' }}>Profile Information</h3>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="avatar w-16 h-16 text-xl">
                      {avatarPreview || user?.avatar_url
                        ? <img src={avatarPreview || user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                        : initials}
                    </div>
                    <button onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center hover:bg-primary-700 transition-colors">
                      ✏️
                    </button>
                    <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text)' }}>{user?.full_name}</div>
                    <div className="text-sm text-slate-400">@{user?.username}</div>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-primary-600 hover:underline mt-1">
                      Change avatar
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" value={profileForm.full_name} onChange={setPF('full_name')} required />
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input className="input pl-6" value={profileForm.username} onChange={setPF('username')} required minLength={3} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input bg-slate-50 dark:bg-slate-900" value={user?.email} disabled />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
                  </div>
                  <div>
                    <label className="label">Bio</label>
                    <textarea className="input resize-none" rows={3}
                      placeholder="Tell your team a bit about yourself…"
                      value={profileForm.bio} onChange={setPF('bio')} />
                  </div>
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile ? '⟳ Saving…' : 'Save Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* Password */}
            {tab === 'password' && (
              <div className="card p-6">
                <h3 className="font-semibold text-lg mb-5" style={{ color: 'var(--text)' }}>Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="label">Current Password</label>
                    <input type="password" className="input" value={passwordForm.current_password}
                      onChange={setPW('current_password')} required placeholder="Enter current password" />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input" value={passwordForm.new_password}
                      onChange={setPW('new_password')} required minLength={8} placeholder="Min. 8 characters" />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input" value={passwordForm.confirm_password}
                      onChange={setPW('confirm_password')} required placeholder="Repeat new password" />
                    {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <button type="submit" disabled={savingPassword} className="btn-primary">
                    {savingPassword ? '⟳ Changing…' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Appearance */}
            {tab === 'appearance' && (
              <div className="card p-6">
                <h3 className="font-semibold text-lg mb-5" style={{ color: 'var(--text)' }}>Appearance</h3>

                <div className="space-y-4">
                  <div>
                    <label className="label">Theme</label>
                    <div className="flex gap-3 mt-2">
                      {[
                        { id: 'light', label: '☀️ Light', desc: 'Clean white interface' },
                        { id: 'dark',  label: '🌙 Dark',  desc: 'Easy on the eyes'     },
                      ].map((t) => (
                        <button key={t.id} onClick={() => theme !== t.id && toggleTheme()}
                          className={`flex-1 p-4 rounded-xl border-2 text-left transition-all
                            ${theme === t.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{t.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm" style={{ color: 'var(--text)' }}>
                    <div className="font-medium mb-1">Account Info</div>
                    <div className="text-slate-400 space-y-1 text-xs">
                      <div>Role: <span className="capitalize font-medium">{user?.role}</span></div>
                      <div>Member since: <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
