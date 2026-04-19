import axios from 'axios';

// Automatically points to your local Node server running on port 5000
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor to inject JWT on every outgoing request automatically
API.interceptors.request.use((req) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const parsed = JSON.parse(userInfo);
    req.headers.Authorization = `Bearer ${parsed.token}`;
  }
  return req;
});

export default API;
