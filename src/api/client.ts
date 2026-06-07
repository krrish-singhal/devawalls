import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000/api';

console.log(`[API CLIENT] Base URL: ${BASE_URL}`);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  // 30 seconds — Render free tier has cold starts up to ~15-20s
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ─── Request Interceptor: Attach JWT token ────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor: Handle errors globally ────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const data = error.response?.data;

    // Enhanced error logging
    if (error.code === 'ECONNABORTED') {
      console.error(`[API] TIMEOUT: ${url} — server took too long to respond`);
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error(`[API] NETWORK ERROR: Cannot reach ${BASE_URL} — check your internet or API URL`);
    } else {
      console.error(`[API] ${status || 'ERR'} ${url}`, data || error.message);
    }

    // Handle 401 globally — clear auth state
    if (status === 401) {
      console.warn('[API] 401 Unauthorized — clearing auth');
      useAuthStore.getState().clearAuth();
    }

    return Promise.reject(error);
  }
);
