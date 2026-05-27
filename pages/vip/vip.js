const membership = require('../../utils/membership.js');

Page({
  data: {
    accessState: membership.getAccessState(),
    plans: [],
    selectedPlanKey: 'halfYear',
    selectedPlan: null,
    paying: false
  },

  onLoad() {
    this.refreshState();
  },

  onShow() {
    this.refreshState();
  },

  async refreshState() {
    const plans = [
      membership.PLANS.monthly,
      membership.PLANS.halfYear,
      membership.PLANS.lifetime
    ];

    this.setData({
      plans,
      selectedPlan: membership.PLANS[this.data.selectedPlanKey],
      accessState: membership.getAccessState()
    });

    try {
      const accessState = await membership.getAccessStateAsync();
      this.setData({ accessState });
    } catch (error) {
      console.warn('会员状态同步失败', error);
    }
  },

  selectPlan(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({
      selectedPlanKey: key,
      selectedPlan: membership.PLANS[key]
    });
  },

  openSelectedPlan() {
    const plan = membership.PLANS[this.data.selectedPlanKey];
    if (!plan || this.data.paying) return;
    if (this.data.accessState && this.data.accessState.vip && this.data.accessState.vip.active) {
      wx.showToast({ title: '会员已开通', icon: 'none' });
      return;
    }

    wx.showModal({
      title: `开通${plan.name}`,
      content: `确认支付 ¥${plan.price}${plan.unit} 开通${plan.name}？`,
      confirmText: '确认开通',
      cancelText: '取消',
      confirmColor: '#ef65b2',
      success: async (res) => {
        if (!res.confirm) return;
        await this.payForPlan(plan.key);
      }
    });
  },

  async payForPlan(planKey) {
    this.setData({ paying: true });
    wx.showLoading({ title: '创建订单中...' });

    try {
      const order = await membership.createPayOrder(planKey);
      if (!order.payment) {
        throw new Error('云函数未返回支付参数');
      }

      wx.hideLoading();
      await new Promise((resolve, reject) => {
        wx.requestPayment({
          ...order.payment,
          success: resolve,
          fail: reject
        });
      });

      wx.showLoading({ title: '确认会员中...' });
      const accessState = await membership.refreshMembershipAfterPay(order.orderNo);
      this.setData({ accessState });
      wx.showToast({ title: accessState.vip.active ? '开通成功' : '支付已完成', icon: 'success' });
    } catch (error) {
      wx.showModal({
        title: '开通失败',
        content: error && error.message ? error.message : '支付暂时未完成，请稍后重试。',
        showCancel: false,
        confirmColor: '#ef65b2'
      });
    } finally {
      wx.hideLoading();
      this.setData({ paying: false });
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
