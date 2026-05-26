const HISTORY_KEY = 'emotion_analysis_history';
const MAX_HISTORY_COUNT = 20;

function safeGetHistory() {
  try {
    const history = wx.getStorageSync(HISTORY_KEY);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('读取历史记录失败', error);
    return [];
  }
}

function formatDate(date) {
  const pad = (num) => String(num).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [pad(date.getHours()), pad(date.getMinutes())].join(':');
}

function normalizeRecord(item) {
  const now = new Date();
  return {
    id: item.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    inputText: item.inputText || '',
    emotionType: item.emotionType || '不确定',
    riskLevel: item.riskLevel || '中',
    psychology: item.psychology || '',
    situationAnalysis: item.situationAnalysis || '',
    replySuggestions: Array.isArray(item.replySuggestions) ? item.replySuggestions.slice(0, 3) : [],
    avoidSaying: Array.isArray(item.avoidSaying) ? item.avoidSaying : [item.avoidSaying || ''],
    createdAt: item.createdAt || formatDate(now)
  };
}

function saveHistory(item) {
  const record = normalizeRecord(item);
  const history = safeGetHistory().filter((historyItem) => historyItem.id !== record.id);
  const nextHistory = [record].concat(history).slice(0, MAX_HISTORY_COUNT);
  wx.setStorageSync(HISTORY_KEY, nextHistory);
  return record;
}

function getHistory() {
  return safeGetHistory();
}

function getHistoryById(id) {
  return safeGetHistory().find((item) => item.id === id) || null;
}

function deleteHistory(id) {
  const nextHistory = safeGetHistory().filter((item) => item.id !== id);
  wx.setStorageSync(HISTORY_KEY, nextHistory);
  return nextHistory;
}

function clearHistory() {
  wx.setStorageSync(HISTORY_KEY, []);
}

module.exports = {
  HISTORY_KEY,
  MAX_HISTORY_COUNT,
  saveHistory,
  getHistory,
  getHistoryById,
  deleteHistory,
  clearHistory
};
