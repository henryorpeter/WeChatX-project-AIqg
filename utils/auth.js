const LOGIN_KEY = 'xinyi_login_info';

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
    console.error('登录信息保存失败', error);
  }
}

function hasCloud() {
  return typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

function getLoginInfo() {
  const info = safeGet(LOGIN_KEY, null);
  return info && info.loggedIn ? info : null;
}

function isLoggedIn() {
  return !!getLoginInfo();
}

function saveLoginInfo(info) {
  const loginInfo = {
    ...info,
    loggedIn: true,
    updatedAt: Date.now()
  };
  safeSet(LOGIN_KEY, loginInfo);
  return loginInfo;
}

function syncLoginInfo(loginInfo) {
  if (!hasCloud()) {
    return Promise.reject(new Error('云开发未初始化，暂时无法记录登录信息。'));
  }

  return wx.cloud.callFunction({
    name: 'saveLoginInfo',
    data: {
      userInfo: loginInfo.userInfo || {},
      loginAt: loginInfo.loginAt || Date.now()
    }
  }).then((res) => {
    if (!res || !res.result || res.result.success === false) {
      throw new Error(res && res.result && res.result.message || '登录信息同步失败');
    }
    const data = res.result.data || {};
    return saveLoginInfo({
      ...loginInfo,
      openid: data.openid || loginInfo.openid || '',
      unionid: data.unionid || loginInfo.unionid || ''
    });
  });
}

function getUserProfile() {
  if (!wx.getUserProfile) {
    return Promise.reject(new Error('当前微信版本不支持登录授权，请升级微信后重试。'));
  }

  return wx.getUserProfile({
    desc: '用于登录后记录分析使用信息'
  });
}

async function loginWithWeChat() {
  const profileRes = await getUserProfile();
  const loginAt = Date.now();
  const loginInfo = {
    userInfo: profileRes.userInfo || {},
    loginAt
  };

  return syncLoginInfo(loginInfo);
}

function requireLogin() {
  const existing = getLoginInfo();
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    wx.showModal({
      title: '需要微信登录',
      content: '登录后才能使用情感分析，并用于记录你的使用次数。',
      confirmText: '微信登录',
      cancelText: '暂不使用',
      confirmColor: '#ef65b2',
      success: async (res) => {
        if (!res.confirm) {
          reject(new Error('用户取消登录'));
          return;
        }

        try {
          const loginInfo = await loginWithWeChat();
          wx.showToast({ title: '登录成功', icon: 'success' });
          resolve(loginInfo);
        } catch (error) {
          wx.showToast({ title: error.message || '登录失败', icon: 'none' });
          reject(error);
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  LOGIN_KEY,
  getLoginInfo,
  isLoggedIn,
  loginWithWeChat,
  requireLogin,
  saveLoginInfo,
  syncLoginInfo
};
