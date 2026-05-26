const storage = require('../../utils/storage.js');
const { getStatusLayout } = require('../../utils/system.js');

Page({
  data: {
    pageTop: 66,
    analysisCount: 0,
    favoriteCount: 8,
    adviceCount: 3,
    streakDays: 8,
    benefits: [
      '无限次情感分析',
      '专属深度分析报告',
      '高情商回复建议',
      '情感问题优先解答',
      '分析记录云端同步',
      '专属客服支持'
    ],
    menus: [
      { icon: '/assets/icons/profile_menu_favorite.png', title: '我的收藏' },
      { icon: '/assets/icons/profile_menu_feedback.png', title: '问题反馈' },
      { icon: '/assets/icons/profile_menu_contact.png', title: '联系我们' },
      { icon: '/assets/icons/profile_menu_privacy.png', title: '隐私与安全' },
      { icon: '/assets/icons/profile_menu_settings.png', title: '设置' }
    ]
  },

  onLoad() {
    this.setData(getStatusLayout(20));
  },

  onShow() {
    const historyCount = storage.getHistory().length;
    this.setData({
      analysisCount: historyCount
    });
  },

  openVip() {
    wx.showToast({ title: 'VIP 功能即将开放', icon: 'none' });
  },

  editProfile() {
    wx.showToast({ title: '资料编辑即将开放', icon: 'none' });
  },

  openMenu(e) {
    const title = e.currentTarget.dataset.title || '功能';
    wx.showToast({ title: `${title}即将开放`, icon: 'none' });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  },

  goProfile() {}
});
