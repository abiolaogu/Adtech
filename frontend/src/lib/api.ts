import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) =>
    api.post('/auth/register', data),
  me: () =>
    api.get('/auth/me')
};

export const campaignsAPI = {
  list: () => api.get('/adtech/campaigns'),
  get: (id: string) => api.get(`/adtech/campaigns/${id}`),
  create: (data: any) => api.post('/adtech/campaigns', data),
  update: (id: string, data: any) => api.put(`/adtech/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/adtech/campaigns/${id}`)
};

export const inventoryAPI = {
  list: () => api.get('/inventory'),
  create: (data: any) => api.post('/inventory', data),
  available: (params: any) => api.get('/inventory/available', { params }),
  forecast: (id: string, params: any) => api.get(`/inventory/${id}/forecast`, { params }),
  analytics: (id: string, params: any) => api.get(`/inventory/${id}/analytics`, { params }),
  optimizeYield: (id: string) => api.get(`/inventory/${id}/optimize-yield`)
};

export const martechAPI = {
  identify: (data: any) => api.post('/martech/identify', data),
  track: (data: any) => api.post('/martech/track', data),
  getProfile: (id: string) => api.get(`/martech/customers/${id}/profile`),
  createAudience: (data: any) => api.post('/martech/audiences', data),
  buildSegment: (id: string) => api.post(`/martech/audiences/${id}/build`),
  getAudienceMembers: (id: string, params: any) =>
    api.get(`/martech/audiences/${id}/members`, { params })
};

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  campaignPerformance: (id: string, params: any) =>
    api.get(`/analytics/campaigns/${id}/performance`, { params }),
  publisherRevenue: (id: string, params: any) =>
    api.get(`/analytics/publishers/${id}/revenue`, { params })
};
