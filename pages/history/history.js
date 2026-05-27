const storage = require('../../utils/storage.js');
const auth = require('../../utils/auth.js');
const { getStatusLayout } = require('../../utils/system.js');

const FILTERS = [
  { label: '全部记录', value: 'all' },
  { label: '积极', value: '积极' },
  { label: '消极', value: '消极' },
  { label: '暧昧', value: '暧昧' },
  { label: '冷淡', value: '冷淡' },
  { label: '矛盾', value: '矛盾' },
  { label: '不确定', value: '不确定' }
];

const ICON_MAP = {
  积极: '/assets/icons/history_mood_positive_face.png',
  消极: '/assets/icons/history_mood_uncertain_question.png',
  暧昧: '/assets/icons/history_mood_warm_heart.png',
  冷淡: '/assets/icons/history_mood_cold_face.png',
  矛盾: '/assets/icons/history_mood_conflict_lightning.png',
  不确定: '/assets/icons/history_mood_uncertain_question.png'
};

function getRiskClass(riskLevel) {
  if (riskLevel === '低') return 'risk-low';
  if (riskLevel === '高') return 'risk-high';
  return 'risk-mid';
}

function getEmotionClass(emotionType) {
  if (emotionType === '积极') return 'emotion-positive';
  if (emotionType === '冷淡') return 'emotion-cold';
  if (emotionType === '矛盾') return 'emotion-conflict';
  if (emotionType === '不确定') return 'emotion-uncertain';
  if (emotionType === '消极') return 'emotion-negative';
  return 'emotion-warm';
}

function brief(text, length) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

Page({
  data: {
    pageTop: 62,
    history: [],
    displayHistory: [],
    hasHistory: false,
    filters: FILTERS,
    activeFilter: 'all',
    showSearch: false,
    searchKeyword: ''
  },

  onLoad() {
    this.setData(getStatusLayout(18));
    this.ensureLoggedIn();
  },

  onShow() {
    if (auth.isLoggedIn()) {
      this.refreshHistory();
    }
  },

  async ensureLoggedIn() {
    try {
      await auth.requireLogin();
      this.refreshHistory();
    } catch (error) {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  refreshHistory() {
    const history = storage.getHistory();
    this.setData({
      history,
      hasHistory: history.length > 0
    });
    this.applyFilters();
  },

  applyFilters() {
    const { history, activeFilter, searchKeyword } = this.data;
    const keyword = String(searchKeyword || '').trim();
    const displayHistory = history
      .filter((item) => activeFilter === 'all' || item.emotionType === activeFilter)
      .filter((item) => {
        if (!keyword) return true;
        const inputText = String(item.inputText || '');
        const emotionType = String(item.emotionType || '');
        return inputText.indexOf(keyword) >= 0 || emotionType.indexOf(keyword) >= 0;
      })
      .map((item) => ({
        ...item,
        title: brief(item.inputText, 18),
        preview: brief(item.situationAnalysis || item.inputText, 30),
        icon: ICON_MAP[item.emotionType] || ICON_MAP['不确定'],
        emotionClass: getEmotionClass(item.emotionType),
        riskClass: getRiskClass(item.riskLevel)
      }));

    this.setData({ displayHistory });
  },

  changeFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.value || 'all' });
    this.applyFilters();
  },

  toggleSearch() {
    const wasShowing = this.data.showSearch;
    this.setData({
      showSearch: !wasShowing,
      searchKeyword: wasShowing ? '' : this.data.searchKeyword
    });
    if (wasShowing) this.applyFilters();
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' });
    this.applyFilters();
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    const item = storage.getHistoryById(id);
    if (!item) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      this.refreshHistory();
      return;
    }

    getApp().globalData.lastResult = item;
    wx.navigateTo({
      url: `/pages/result/result?id=${encodeURIComponent(id)}`
    });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条分析记录吗？',
      confirmColor: '#f04e96',
      success: (res) => {
        if (!res.confirm) return;
        const history = storage.deleteHistory(id);
        this.setData({
          history,
          hasHistory: history.length > 0
        });
        this.applyFilters();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  clearAll() {
    if (!this.data.hasHistory) return;

    wx.showModal({
      title: '清空历史',
      content: '清空后无法恢复，确认删除全部分析记录吗？',
      confirmColor: '#f04e96',
      success: (res) => {
        if (!res.confirm) return;
        storage.clearHistory();
        this.setData({
          history: [],
          displayHistory: [],
          hasHistory: false,
          activeFilter: 'all',
          searchKeyword: ''
        });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {},

  goProfile() {
    this.goLoggedInPage('/pages/profile/profile');
  },

  async goLoggedInPage(url) {
    try {
      await auth.requireLogin();
      wx.reLaunch({ url });
    } catch (error) {
      wx.showToast({ title: '登录后才能继续使用', icon: 'none' });
    }
  }
});
