const FREE_ANALYSIS_LIMIT = 3;
const USAGE_KEY = 'xinyi_analysis_usage_count';
const VIP_KEY = 'xinyi_vip_status';

const PLANS = {
  monthly: {
    key: 'monthly',
    name: '连续包月',
    price: '19.9',
    unit: '/月',
    amount: 1990,
    durationDays: 31,
    badge: '轻量体验',
    subtitle: '适合先体验完整分析能力',
    benefits: ['不限次数情感分析', '完整关系判断与回复建议', '会员期内持续使用']
  },
  halfYear: {
    key: 'halfYear',
    name: '半年会员',
    price: '88',
    unit: '',
    amount: 8800,
    durationDays: 183,
    badge: '安心陪伴',
    subtitle: '适合一段关系的持续观察',
    benefits: ['约 6 个月不限次数分析', '适合暧昧、复合、长期沟通复盘', '比月度方案更省心']
  },
  lifetime: {
    key: 'lifetime',
    name: '永久会员',
    price: '198',
    unit: '',
    amount: 19800,
    durationDays: 0,
    badge: '长期守护',
    subtitle: '一次开通，长期安心使用',
    benefits: ['永久不限次数分析', '长期保存并回看历史记录', '适合长期关系管理和自我成长']
  }
};

function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    console.error('会员信息保存失败', error);
  }
}

function hasCloud() {
  return typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

function callCloud(name, data = {}) {
  if (!hasCloud()) {
    return Promise.reject(new Error('云开发未初始化，请先开通微信云开发并上传云函数。'));
  }

  return wx.cloud.callFunction({ name, data }).then((res) => {
    if (!res || !res.result) {
      throw new Error('云函数未返回结果');
    }
    if (res.result.success === false) {
      throw new Error(res.result.message || '云函数调用失败');
    }
    return res.result;
  });
}

function formatVipStatus(status) {
  if (!status || typeof status !== 'object') {
    return { active: false, planKey: '', planName: '', expiresAt: 0, expireText: '' };
  }

  if (status.planKey === 'lifetime') {
    return { ...status, active: true, expireText: '永久有效' };
  }

  const expiresAt = Number(status.expiresAt || 0);
  const expireDate = expiresAt ? new Date(expiresAt) : null;
  const expireText = expireDate
    ? `${expireDate.getFullYear()}.${String(expireDate.getMonth() + 1).padStart(2, '0')}.${String(expireDate.getDate()).padStart(2, '0')}`
    : '';

  return {
    ...status,
    expiresAt,
    active: expiresAt > Date.now(),
    expireText
  };
}

function normalizeAccessState(rawState = {}) {
  const vip = formatVipStatus(rawState.vip || rawState);
  const usedCount = Number(rawState.usedCount || 0);
  const freeLimit = Number(rawState.freeLimit || FREE_ANALYSIS_LIMIT);
  const remainingFreeCount = Math.max(freeLimit - usedCount, 0);

  return {
    vip,
    usedCount,
    freeLimit,
    remainingFreeCount,
    canAnalyze: vip.active || remainingFreeCount > 0
  };
}

function cacheAccessState(state) {
  safeSet(VIP_KEY, state.vip);
  safeSet(USAGE_KEY, state.usedCount);
}

function getUsageCount() {
  const count = Number(safeGet(USAGE_KEY, 0));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getVipStatus() {
  return formatVipStatus(safeGet(VIP_KEY, null));
}

function getAccessState() {
  return normalizeAccessState({
    vip: getVipStatus(),
    usedCount: getUsageCount(),
    freeLimit: FREE_ANALYSIS_LIMIT
  });
}

async function getAccessStateAsync() {
  if (!hasCloud()) {
    return getAccessState();
  }

  const result = await callCloud('getMembershipStatus');
  const state = normalizeAccessState(result.data || result);
  cacheAccessState(state);
  return state;
}

async function recordAnalysis() {
  if (!hasCloud()) {
    const state = getAccessState();
    if (state.vip.active) return state;
    safeSet(USAGE_KEY, state.usedCount + 1);
    return getAccessState();
  }

  const result = await callCloud('recordAnalysisUsage');
  const state = normalizeAccessState(result.data || result);
  cacheAccessState(state);
  return state;
}

async function createPayOrder(planKey) {
  const result = await callCloud('createPayOrder', { planKey });
  return result.data || result;
}

async function refreshMembershipAfterPay(orderNo) {
  const result = await callCloud('getMembershipStatus', { orderNo });
  const state = normalizeAccessState(result.data || result);
  cacheAccessState(state);
  return state;
}

function activatePlan(planKey) {
  const plan = PLANS[planKey];
  if (!plan) {
    throw new Error('未找到会员套餐');
  }

  const now = Date.now();
  const status = {
    planKey: plan.key,
    planName: plan.name,
    activatedAt: now,
    expiresAt: plan.key === 'lifetime' ? 0 : now + plan.durationDays * 24 * 60 * 60 * 1000
  };

  safeSet(VIP_KEY, status);
  return getVipStatus();
}

module.exports = {
  FREE_ANALYSIS_LIMIT,
  PLANS,
  getUsageCount,
  getVipStatus,
  getAccessState,
  getAccessStateAsync,
  recordAnalysis,
  createPayOrder,
  refreshMembershipAfterPay,
  activatePlan
};
