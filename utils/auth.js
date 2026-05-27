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
      code: loginInfo.code || '',
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

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res && res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('微信登录未返回 code'));
      },
      fail: reject
    });
  });
}

async function loginWithWeChat() {
  const code = await wxLogin();
  const loginAt = Date.now();
  const loginInfo = {
    code,
    userInfo: {},
    loginAt
  };

  return syncLoginInfo(loginInfo);
}

function requireLogin() {
  const existing = getLoginInfo();
  if (existing) {
    return Promise.resolve(existing);
  }

  return loginWithWeChat()
    .then((loginInfo) => {
      wx.showToast({ title: '登录成功', icon: 'success' });
      return loginInfo;
    })
    .catch((error) => {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
      throw error;
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
