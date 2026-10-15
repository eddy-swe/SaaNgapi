import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saangapi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname.startsWith('/dashboard')) {
      localStorage.removeItem('saangapi_token');
      localStorage.removeItem('saangapi_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
