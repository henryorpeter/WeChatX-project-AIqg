const { analyzeEmotion } = require('../../utils/analyze.js');
const storage = require('../../utils/storage.js');
const membership = require('../../utils/membership.js');

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

    try {
      const accessState = await membership.getAccessStateAsync();
      if (!accessState.canAnalyze) {
        this.showDailyLimitReached();
        return;
      }
    } catch (error) {
      wx.showModal({
        title: '会员状态获取失败',
        content: error.message || '请检查云开发配置后重试。',
        showCancel: false,
        confirmColor: '#ef65b2'
      });
      return;
    }

    this.setData({ reAnalyzing: true, errorMessage: '' });
    wx.showLoading({ title: '重新分析中...' });

    try {
      const nextResult = await analyzeEmotion(current.inputText, { scene: current.scene });
      await membership.recordAnalysis();
      const record = storage.saveHistory(nextResult);
      getApp().globalData.lastResult = record;
      this.setData({
        result: record,
        riskClass: getRiskClass(record.riskLevel)
      });
      wx.showToast({ title: '已更新结果', icon: 'success' });
    } catch (error) {
      console.error('重新分析失败', error);
      const message = error && error.message ? error.message : '重新分析失败，请稍后重试。';
      this.setData({ errorMessage: message });
      wx.showModal({
        title: '分析失败',
        content: message,
        showCancel: false,
        confirmColor: '#ef65b2'
      });
    } finally {
      wx.hideLoading();
      this.setData({ reAnalyzing: false });
    }
  },

  showDailyLimitReached() {
    wx.showModal({
      title: '今日次数已用完',
      content: '今日 2 次免费分析已用完，请明天再来继续使用心依AI。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#ef65b2'
    });
  },

  unlockWithRewardedAd() {
    if (!membership.REWARDED_AD_UNIT_ID) {
      wx.showModal({
        title: '广告位未配置',
        content: '激励视频广告位开通后，填入广告位 ID 即可启用看广告解锁。',
        showCancel: false,
        confirmColor: '#ef65b2'
      });
      return;
    }

    if (!wx.createRewardedVideoAd) {
      wx.showToast({ title: '当前微信版本暂不支持广告解锁', icon: 'none' });
      return;
    }

    const rewardedAd = wx.createRewardedVideoAd({ adUnitId: membership.REWARDED_AD_UNIT_ID });
    rewardedAd.onClose((res) => {
      if (res && res.isEnded) {
        membership.addAdUnlock();
        wx.showToast({ title: '已解锁 1 次分析', icon: 'success' });
      } else {
        wx.showToast({ title: '看完广告后才能解锁', icon: 'none' });
      }
    });
    rewardedAd.onError((error) => {
      console.warn('激励视频广告加载失败', error);
      wx.showToast({ title: '广告暂时不可用，请稍后再试', icon: 'none' });
    });
    rewardedAd.show().catch(() => rewardedAd.load().then(() => rewardedAd.show()));
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  }
});
