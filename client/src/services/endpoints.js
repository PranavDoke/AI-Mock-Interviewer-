import api from './api';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshTokens: (refreshToken) => api.post('/auth/refresh-tokens', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  getSkillProfile: () => api.get('/users/skills'),
};

export const interviewAPI = {
  startSession: (config) => api.post('/interviews/sessions', config),
  listSessions: (params) => api.get('/interviews/sessions', { params }),
  getSession: (sessionId) => api.get(`/interviews/sessions/${sessionId}`),
  getNextQuestion: (sessionId) => api.get(`/interviews/sessions/${sessionId}/next-question`),
  submitAnswer: (sessionId, data) => api.post(`/interviews/sessions/${sessionId}/submit`, data),
  abandonSession: (sessionId) => api.post(`/interviews/sessions/${sessionId}/abandon`),
};

export const executionAPI = {
  executeCode: (data) => api.post('/execution/run', data),
  getRuntimes: () => api.get('/execution/runtimes'),
  healthCheck: () => api.get('/execution/health'),
};

export const analyticsAPI = {
  getDashboard: (period) => api.get('/analytics/dashboard', { params: { period } }),
  getTopicAnalytics: (topic, period) => api.get('/analytics/topics', { params: { topic, period } }),
};

export const questionAPI = {
  listQuestions: (params) => api.get('/questions', { params }),
  getTopicAvailability: (params) => api.get('/questions/topics/availability', { params }),
  getQuestion: (id) => api.get(`/questions/${id}`),
};
