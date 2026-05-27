const storage = require('../../utils/storage.js');
const membership = require('../../utils/membership.js');
const { getStatusLayout } = require('../../utils/system.js');

const PROFILE_KEY = 'emotion_user_profile';
const FEEDBACK_KEY = 'emotion_feedback_list';
const PRIVACY_KEY = 'emotion_privacy_settings';

const DEFAULT_PROFILE = {
  avatarUrl: '/assets/icons/profile_avatar.png',
  nickname: '情感探索者',
  slogan: '用心理解，用爱回应'
};

const DEFAULT_PRIVACY = {
  localHistory: true,
  anonymousMode: true,
  serviceNotice: false
};

Page({
  data: {
    pageTop: 66,
    profile: DEFAULT_PROFILE,
    profileDraft: DEFAULT_PROFILE,
    vipStatus: {
      active: false,
      planName: ''
    },
    showVipEntry: false,
    analysisCount: 0,
    adviceCount: 3,
    streakDays: 8,
    activePanel: '',
    feedbackTypes: ['体验问题', '分析建议', '内容纠错'],
    feedbackDraft: {
      type: '体验问题',
      content: '',
      contact: ''
    },
    contactInfo: {
      wechat: 'Y666Z78',
      email: '1561784670@qq.com'
    },
    privacySettings: DEFAULT_PRIVACY,
    benefits: [
      '无限次情感分析',
      '情感问题优先解答',
      '专属深度分析报告',
      '分析记录云端同步',
      '高情商回复建议',
      '专属客服支持'
    ],
    menus: [
      { key: 'feedback', icon: '/assets/icons/profile_menu_feedback.png', title: '问题反馈', desc: '告诉我们哪里需要改进' },
      { key: 'contact', icon: '/assets/icons/profile_menu_contact.png', title: '联系我们', desc: '获取客服与合作方式' },
      { key: 'privacy', icon: '/assets/icons/profile_menu_privacy.png', title: '隐私与安全', desc: '管理记录、匿名与通知' },
      { key: 'settings', icon: '/assets/icons/profile_menu_settings.png', title: '设置', desc: '清理数据与查看版本' }
    ]
  },

  onLoad() {
    this.setData({
      ...getStatusLayout(20),
      profile: this.getSavedProfile(),
      privacySettings: this.getSavedPrivacy(),
      vipStatus: membership.getVipStatus()
    });
  },

  onShow() {
    const historyCount = storage.getHistory().length;
    this.setData({
      analysisCount: historyCount,
      vipStatus: membership.getVipStatus()
    });
    this.refreshVipStatus();
  },

  async refreshVipStatus() {
    try {
      const state = await membership.getAccessStateAsync();
      this.setData({ vipStatus: state.vip });
    } catch (error) {
      console.warn('会员状态同步失败', error);
    }
  },

  openVip() {
    if (this.data.vipStatus.active) return;
    wx.navigateTo({ url: '/pages/vip/vip' });
  },

  editProfile() {
    this.setData({
      activePanel: 'profile',
      profileDraft: { ...this.data.profile }
    });
  },

  openMenu(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ activePanel: key });
  },

  handleContact(e) {
    console.log('客服会话入口', e.detail);
  },

  closePanel() {
    this.setData({ activePanel: '' });
  },

  stopPanelTap() {},

  getSavedProfile() {
    try {
      const profile = wx.getStorageSync(PROFILE_KEY);
      return profile && typeof profile === 'object' ? { ...DEFAULT_PROFILE, ...profile } : DEFAULT_PROFILE;
    } catch (error) {
      return DEFAULT_PROFILE;
    }
  },

  getSavedPrivacy() {
    try {
      const settings = wx.getStorageSync(PRIVACY_KEY);
      return settings && typeof settings === 'object' ? { ...DEFAULT_PRIVACY, ...settings } : DEFAULT_PRIVACY;
    } catch (error) {
      return DEFAULT_PRIVACY;
    }
  },

  chooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({
      'profileDraft.avatarUrl': avatarUrl
    });
  },

  updateProfileDraft(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`profileDraft.${field}`]: e.detail.value
    });
  },

  saveProfile() {
    const nickname = this.data.profileDraft.nickname.trim();
    const slogan = this.data.profileDraft.slogan.trim();

    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    const profile = {
      avatarUrl: this.data.profileDraft.avatarUrl || DEFAULT_PROFILE.avatarUrl,
      nickname: nickname.slice(0, 12),
      slogan: (slogan || DEFAULT_PROFILE.slogan).slice(0, 24)
    };

    wx.setStorageSync(PROFILE_KEY, profile);
    this.setData({
      profile,
      activePanel: ''
    });
    wx.showToast({ title: '资料已保存', icon: 'success' });
  },

  selectFeedbackType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'feedbackDraft.type': type
    });
  },

  updateFeedbackDraft(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`feedbackDraft.${field}`]: e.detail.value
    });
  },

  submitFeedback() {
    const content = this.data.feedbackDraft.content.trim();
    const contact = this.data.feedbackDraft.contact.trim();

    if (content.length < 5) {
      wx.showToast({ title: '请至少输入 5 个字', icon: 'none' });
      return;
    }

    const feedback = {
      id: `${Date.now()}`,
      type: this.data.feedbackDraft.type,
      content,
      contact,
      createdAt: new Date().toISOString()
    };
    const list = wx.getStorageSync(FEEDBACK_KEY) || [];
    wx.setStorageSync(FEEDBACK_KEY, [feedback].concat(Array.isArray(list) ? list : []).slice(0, 20));
    this.setData({
      activePanel: '',
      feedbackDraft: {
        type: '体验问题',
        content: '',
        contact: ''
      }
    });
    wx.showToast({ title: '反馈已提交', icon: 'success' });
  },

  copyContact(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    wx.setClipboardData({ data: value });
  },

  togglePrivacy(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const privacySettings = {
      ...this.data.privacySettings,
      [key]: e.detail.value
    };
    wx.setStorageSync(PRIVACY_KEY, privacySettings);
    this.setData({ privacySettings });
  },

  clearHistory() {
    wx.showModal({
      title: '清空历史记录',
      content: '清空后将无法恢复，确认继续吗？',
      confirmText: '清空',
      confirmColor: '#ef65b2',
      success: (res) => {
        if (!res.confirm) return;
        storage.clearHistory();
        this.setData({ analysisCount: 0 });
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  resetProfile() {
    wx.showModal({
      title: '重置个人资料',
      content: '将恢复默认昵称、头像和签名。',
      confirmText: '重置',
      confirmColor: '#ef65b2',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync(PROFILE_KEY);
        this.setData({
          profile: DEFAULT_PROFILE,
          profileDraft: DEFAULT_PROFILE
        });
        wx.showToast({ title: '已重置', icon: 'success' });
      }
    });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  },

  goProfile() {}
});
