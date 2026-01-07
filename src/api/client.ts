// src/api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1', // URL ของ FastAPI
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: ทุกครั้งที่ยิง API ให้แอบแนบ Token ไปด้วย (ถ้ามี)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
