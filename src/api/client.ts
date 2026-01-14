// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: แนบ Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: ดักจับ 401 Token หมดอายุ
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // ถ้า Token ใช้ไม่ได้ ให้ลบออกแล้ว Refresh หน้าเพื่อเข้า Login ใหม่
      localStorage.removeItem('token');
      window.location.href = '/login'; // หรือจะปล่อยให้ AuthContext จัดการก็ได้
    }
    return Promise.reject(error);
  }
);

export default client;