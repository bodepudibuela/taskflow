// src/utils/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → refresh
let refreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        if (refreshing) {
          return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
            .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); })
            .catch(Promise.reject);
        }
        original._retry = true;
        refreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(original);
        } catch (err) {
          processQueue(err);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(err);
        } finally {
          refreshing = false;
        }
      }
      // Other 401 → redirect
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ── Projects ─────────────────────────────────────────────
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  inviteMember: (id, email, role) => api.post(`/projects/${id}/members`, { email, role }),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
  getActivity: (id, limit = 20) => api.get(`/projects/${id}/activity?limit=${limit}`),
};

// ── Tasks ─────────────────────────────────────────────────
export const tasksAPI = {
  getByProject: (projectId, params = {}) => api.get(`/tasks/project/${projectId}`, { params }),
  create: (projectId, data) => api.post(`/tasks/project/${projectId}`, data),
  get: (taskId) => api.get(`/tasks/${taskId}`),
  update: (taskId, data) => api.put(`/tasks/${taskId}`, data),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
  reorder: (tasks, projectId) => api.put('/tasks/reorder', { tasks, projectId }),
  addComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  updateComment: (commentId, content) => api.put(`/tasks/comments/${commentId}`, { content }),
  deleteComment: (commentId) => api.delete(`/tasks/comments/${commentId}`),
  uploadAttachment: (taskId, formData) => api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── Dashboard ──────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// ── Notifications ──────────────────────────────────────────
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/all/read'),
};

// ── Users ──────────────────────────────────────────────────
export const usersAPI = {
  search: (q) => api.get(`/users/search?q=${q}`),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changePassword: (data) => api.put('/users/password', data),
  getAll: () => api.get('/users'),
};

export default api;
