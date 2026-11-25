import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

// Appliances
export const getAppliances = () => api.get('/appliances').then(r => r.data)
export const createAppliance = (data) => api.post('/appliances', data).then(r => r.data)
export const updateAppliance = (id, data) => api.put(`/appliances/${id}`, data).then(r => r.data)
export const deleteAppliance = (id) => api.delete(`/appliances/${id}`)
export const getCategories = () => api.get('/appliances/categories').then(r => r.data)

// Consumption
export const getDashboardSummary = () => api.get('/consumption/summary').then(r => r.data)
export const getDailyConsumption = (start, end) =>
  api.get('/consumption/daily', { params: { start, end } }).then(r => r.data)
export const getMonthlyConsumption = (year) =>
  api.get('/consumption/monthly', { params: { year } }).then(r => r.data)
export const recalculate = () => api.post('/consumption/recalculate').then(r => r.data)

// Bills
export const getBills = () => api.get('/bills').then(r => r.data)
export const getBillEstimate = () => api.get('/bills/estimate').then(r => r.data)
export const getBill = (year, month) => api.get(`/bills/${year}/${month}`).then(r => r.data)

// Insights
export const getAnomalies = (days) => api.get('/insights/anomalies', { params: { days } }).then(r => r.data)
export const getRecommendations = () => api.get('/insights/recommendations').then(r => r.data)
export const runAnalysis = () => api.post('/insights/analyze').then(r => r.data)

// Chat
export const getChatSessions = () => api.get('/chat/sessions').then(r => r.data)
export const getChatSession = (id) => api.get(`/chat/sessions/${id}`).then(r => r.data)
export const sendMessage = (data) => api.post('/chat/message', data).then(r => r.data)
export const deleteChatSession = (id) => api.delete(`/chat/sessions/${id}`)

// Reports
export const getReports = () => api.get('/reports').then(r => r.data)
export const generateReport = (year, month) =>
  api.post('/reports/generate', null, { params: { year, month } }).then(r => r.data)
export const getReport = (id) => api.get(`/reports/${id}`).then(r => r.data)

// Settings
export const getSettings = () => api.get('/settings').then(r => r.data)
export const updateSettings = (data) => api.put('/settings', data).then(r => r.data)

export default api
