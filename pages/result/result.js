const { analyzeEmotion } = require('../../utils/analyze.js');
const storage = require('../../utils/storage.js');

function getRiskClass(riskLevel) {
  if (riskLevel === '低') return 'risk-low';
  if (riskLevel === '高') return 'risk-high';
  return 'risk-mid';
}

Page({
  data: {
    result: null,
    loading: true,
    reAnalyzing: false,
    errorMessage: '',
    riskClass: 'risk-mid'
  },

  onLoad(options) {
    this.loadResult(options && options.id);
  },

  loadResult(id) {
    const decodedId = id ? decodeURIComponent(id) : '';
    const appResult = getApp().globalData.lastResult;
    const historyResult = decodedId ? storage.getHistoryById(decodedId) : null;
    const result = historyResult || appResult || null;

    if (!result) {
      this.setData({
        loading: false,
        errorMessage: '没有找到本次分析结果，请返回首页重新分析。'
      });
      return;
    }

    this.setData({
      result,
      loading: false,
      errorMessage: '',
      riskClass: getRiskClass(result.riskLevel)
    });
  },

  copy(e) {
    const text = e.currentTarget.dataset.text || '';
    if (!text) return;

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
    });
  },

  async reAnalyze() {
    const current = this.data.result;
    if (!current || !current.inputText || this.data.reAnalyzing) return;

    this.setData({ reAnalyzing: true, errorMessage: '' });
    wx.showLoading({ title: '重新分析中...' });

    try {
      const nextResult = await analyzeEmotion(current.inputText);
      const record = storage.saveHistory(nextResult);
      getApp().globalData.lastResult = record;
      this.setData({
        result: record,
        riskClass: getRiskClass(record.riskLevel)
      });
      wx.showToast({ title: '已更新结果', icon: 'success' });
    } catch (error) {
      console.error('重新分析失败', error);
      this.setData({ errorMessage: '重新分析失败，请稍后重试。' });
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ reAnalyzing: false });
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  }
});
