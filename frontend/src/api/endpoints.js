import api from './client';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const tapApi = {
  getState: () => api.get('/tap/state').then((r) => r.data),
  getRequestId: () => api.get('/tap/request-id').then((r) => r.data),
  sendTap: (payload) => api.post('/tap', payload).then((r) => r.data),
  getHistory: (limit = 30) => api.get(`/tap/history?limit=${limit}`).then((r) => r.data),
  getLeague: () => api.get('/tap/league').then((r) => r.data),
  getSeason: () => api.get('/tap/season').then((r) => r.data),
  purchaseUpgrade: (payload) => api.post('/tap/upgrade', payload).then((r) => r.data),
  activateBoost: () => api.post('/tap/boost/activate').then((r) => r.data),
  purchaseEnergyBank: () => api.post('/tap/energy-bank/purchase').then((r) => r.data),
  purchaseEnergyShield: () => api.post('/tap/shield/purchase').then((r) => r.data),
  getMissions: () => api.get('/tap/missions').then((r) => r.data),
  claimMission: (id) => api.post(`/tap/missions/${id}/claim`).then((r) => r.data),
  getDailyChallenge: () => api.get('/tap/daily-challenge').then((r) => r.data),
  claimDailyChallenge: () => api.post('/tap/daily-challenge/claim').then((r) => r.data),
  getLuckyStatus: () => api.get('/tap/lucky').then((r) => r.data),
  spin: (requestId) => api.post('/tap/lucky/spin', { requestId }).then((r) => r.data),
};

export const adminApi = {
  getConfig: () => api.get('/admin/config').then((r) => r.data),
  updateConfig: (config, reason) => api.put('/admin/config', { config, reason }).then((r) => r.data),
  getConfigAudit: () => api.get('/admin/config/audit').then((r) => r.data),
  getTapAnalytics: () => api.get('/admin/analytics/taps').then((r) => r.data),
  getRewardAnalytics: () => api.get('/admin/analytics/rewards').then((r) => r.data),
  getAntiAbuseAnalytics: () => api.get('/admin/analytics/anti-abuse').then((r) => r.data),
  getAdAnalytics: () => api.get('/admin/analytics/ads').then((r) => r.data),
  getSeasons: () => api.get('/admin/seasons').then((r) => r.data),
  forceRollover: () => api.post('/admin/seasons/rollover').then((r) => r.data),
  getLedger: (params = {}) => api.get('/admin/ledger', { params }).then((r) => r.data),
};
