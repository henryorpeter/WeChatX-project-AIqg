const LOGIN_KEY = 'xinyi_login_info';
const PROFILE_KEY = 'emotion_user_profile';

const DEFAULT_AVATAR = '/assets/icons/profile_avatar.png';
const DEFAULT_NICKNAME = '情感探索者';

function safeGet(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    console.warn(`save ${key} failed`, error);
  }
}

function normalizeProfile(profile = {}) {
  const nickname = String(profile.nickname || '').trim();

  return {
    avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
    nickname: (nickname || DEFAULT_NICKNAME).slice(0, 12),
    slogan: String(profile.slogan || '用心理解，用爱回应').trim().slice(0, 24)
  };
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res && res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('微信登录凭证获取失败'));
      },
      fail: reject
    });
  });
}

function hasCloud() {
  return typeof wx !== 'undefined' && Boolean(wx.cloud && wx.cloud.callFunction);
}

function shouldSyncCloud() {
  try {
    const app = typeof getApp === 'function' ? getApp() : null;
    return Boolean(app && app.globalData && app.globalData.enableCloudLoginSync);
  } catch (error) {
    return false;
  }
}

function callCloud(name, data) {
  if (!hasCloud() || !shouldSyncCloud()) return Promise.resolve(null);
  return wx.cloud.callFunction({ name, data }).then((res) => res.result || null);
}

function getLoginInfo() {
  return safeGet(LOGIN_KEY, null);
}

function isLoggedIn() {
  const info = getLoginInfo();
  return Boolean(info && info.loggedIn && info.userInfo);
}

function getProfile() {
  const loginInfo = getLoginInfo();
  const savedProfile = safeGet(PROFILE_KEY, {});
  return normalizeProfile({
    ...(loginInfo && loginInfo.userInfo ? loginInfo.userInfo : {}),
    ...(savedProfile || {})
  });
}

async function loginOneTap() {
  const savedProfile = getProfile();
  const loginCode = await wxLogin();
  const loginAt = new Date().toISOString();
  const userInfo = normalizeProfile(savedProfile);
  let cloudResult = null;

  try {
    cloudResult = await callCloud('saveLoginInfo', {
      loginCode,
      userInfo,
      loginAt,
      loginType: 'wechat_quick'
    });
  } catch (error) {
    const message = error && (error.errMsg || error.message || '');
    if (message.indexOf('FUNCTION_NOT_FOUND') === -1 && message.indexOf('-501000') === -1) {
      console.warn('saveLoginInfo cloud sync failed, use local session', error);
    }
  }

  const loginInfo = {
    loggedIn: true,
    loginAt,
    loginType: 'wechat_quick',
    localOnly: !(cloudResult && cloudResult.success),
    openid: cloudResult && cloudResult.data ? cloudResult.data.openid : '',
    unionid: cloudResult && cloudResult.data ? cloudResult.data.unionid : '',
    userInfo
  };

  safeSet(LOGIN_KEY, loginInfo);
  safeSet(PROFILE_KEY, userInfo);
  return loginInfo;
}

function saveUserProfile(profile) {
  const userInfo = normalizeProfile(profile);
  const loginInfo = getLoginInfo();

  safeSet(PROFILE_KEY, userInfo);

  if (loginInfo && loginInfo.loggedIn) {
    safeSet(LOGIN_KEY, {
      ...loginInfo,
      userInfo: {
        ...(loginInfo.userInfo || {}),
        ...userInfo
      }
    });
  }

  return userInfo;
}

function logout() {
  try {
    wx.removeStorageSync(LOGIN_KEY);
  } catch (error) {
    console.warn('logout failed', error);
  }
}

module.exports = {
  LOGIN_KEY,
  PROFILE_KEY,
  DEFAULT_AVATAR,
  DEFAULT_NICKNAME,
  getLoginInfo,
  getProfile,
  isLoggedIn,
  loginOneTap,
  logout,
  saveUserProfile
};
