import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@types';

const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-comments-automation-production.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleAuth: (data: { accessToken: string; refreshToken: string; providerId: string; email: string; firstName?: string; lastName?: string; avatar?: string }) =>
    api.post('/auth/google', data),
  googleOAuthUrl: () => api.get('/auth/google'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; avatar?: string }) =>
    api.post('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  verifyEmail: (token: string) => api.get(`/auth/verify-email/${token}`),
};

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; role?: string; subscriptionTier?: string }) =>
    api.get('/users', { params }),
  getStats: () => api.get('/users/stats'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }),
  updateSubscription: (id: string, data: { tier: string; expiresAt?: string }) =>
    api.put(`/users/${id}/subscription`, data),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

export const channelsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/channels', { params }),
  connect: (data: { youtubeChannelId: string; accessToken: string; refreshToken: string; tokenExpiresAt: string; scope: string[]; channelInfo: any }) =>
    api.post('/channels/connect', data),
  getById: (id: string) => api.get(`/channels/${id}`),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  disconnect: (id: string) => api.delete(`/channels/${id}`),
};

export const automationsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; channelId?: string }) =>
    api.get('/automations', { params }),
  create: (data: any) => api.post('/automations', data),
  getById: (id: string) => api.get(`/automations/${id}`),
  update: (id: string, data: any) => api.put(`/automations/${id}`, data),
  delete: (id: string) => api.delete(`/automations/${id}`),
  duplicate: (id: string) => api.post(`/automations/${id}/duplicate`),
  toggleStatus: (id: string, status: string) => api.put(`/automations/${id}/status`, { status }),
  getExecutions: (id: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`/automations/${id}/executions`, { params }),
};

export const commentsApi = {
  getAll: (params?: { page?: number; limit?: number; channelId?: string; videoId?: string; processed?: boolean; search?: string }) =>
    api.get('/comments', { params }),
  getStats: (channelId?: string) => api.get('/comments/stats', { params: { channelId } }),
  getById: (id: string) => api.get(`/comments/${id}`),
  reply: (id: string, data: { text: string; automationId?: string }) => api.post(`/comments/${id}/reply`, data),
};

export const emailsApi = {
  getCaptures: (params?: { page?: number; limit?: number; channelId?: string; automationId?: string; search?: string }) =>
    api.get('/emails/captures', { params }),
  getSequences: (params?: { page?: number; limit?: number }) => api.get('/emails/sequences', { params }),
  createSequence: (data: any) => api.post('/emails/sequences', data),
  getSequenceById: (id: string) => api.get(`/emails/sequences/${id}`),
  updateSequence: (id: string, data: any) => api.put(`/emails/sequences/${id}`, data),
  deleteSequence: (id: string) => api.delete(`/emails/sequences/${id}`),
  sendEmail: (data: any) => api.post('/emails/send', data),
  getLogs: (params?: { page?: number; limit?: number; status?: string; emailCaptureId?: string }) =>
    api.get('/emails/logs', { params }),
};

export const landingPagesApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/landing-pages', { params }),
  create: (data: any) => api.post('/landing-pages', data),
  getById: (id: string) => api.get(`/landing-pages/${id}`),
  update: (id: string, data: any) => api.put(`/landing-pages/${id}`, data),
  delete: (id: string) => api.delete(`/landing-pages/${id}`),
  publish: (id: string) => api.post(`/landing-pages/${id}/publish`),
  unpublish: (id: string) => api.post(`/landing-pages/${id}/unpublish`),
  getSubmissions: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/landing-pages/${id}/submissions`, { params }),
  getPublic: (slug: string) => api.get(`/landing-pages/public/${slug}`),
  submitPublic: (slug: string, formData: Record<string, any>, utmParams?: Record<string, any>) =>
    api.post(`/landing-pages/public/${slug}/submit`, { formData, utmParams }),
};

export const analyticsApi = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getAutomationStats: (params?: { automationId?: string; days?: number }) =>
    api.get('/analytics/automations', { params }),
  getEmailStats: (days?: number) => api.get('/analytics/emails', { params: { days } }),
  getChannelAnalytics: (channelId: string, days?: number) =>
    api.get(`/analytics/channels/${channelId}`, { params: { days } }),
  trackEvent: (data: any) => api.post('/analytics/track', data),
  getEvents: (params?: { page?: number; limit?: number; eventType?: string; channelId?: string; automationId?: string; startDate?: string; endDate?: string }) =>
    api.get('/analytics/events', { params }),
};

export const webhooksApi = {
  subscribe: (channelId: string) => api.post(`/webhooks/subscribe/${channelId}`),
  unsubscribe: (channelId: string) => api.post(`/webhooks/unsubscribe/${channelId}`),
  getEvents: (channelId: string, params?: { page?: number; limit?: number; eventType?: string; processed?: boolean }) =>
    api.get(`/webhooks/events/${channelId}`, { params }),
};

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; subscriptionTier?: string; sortBy?: string; sortOrder?: string }) =>
    api.get('/admin/users', { params }),
  getUserDetails: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (params?: { page?: number; limit?: number; userId?: string; adminId?: string; action?: string; resource?: string }) =>
    api.get('/admin/audit-logs', { params }),
  getConfig: () => api.get('/admin/config'),
  updateConfig: (key: string, value: any) => api.put(`/admin/config/${key}`, { value }),
};

export default api;