const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function cleanUserInfo(userInfo = {}) {
  const nickname = String(userInfo.nickname || '').trim();

  return {
    avatarUrl: userInfo.avatarUrl || '/assets/icons/profile_avatar.png',
    nickname: (nickname || '情感探索者').slice(0, 12),
    slogan: String(userInfo.slogan || '用心理解，用爱回应').trim().slice(0, 24)
  };
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const unionid = wxContext.UNIONID || '';
  const userInfo = cleanUserInfo(event.userInfo || {});
  const now = new Date();

  if (!openid) {
    return {
      success: false,
      message: '未获取到 openid'
    };
  }

  const userDoc = {
    openid,
    unionid,
    userInfo,
    loginType: event.loginType || 'wechat_quick',
    updatedAt: now,
    lastLoginAt: now
  };

  await db.collection('users').doc(openid).set({
    data: userDoc
  });

  await db.collection('login_logs').add({
    data: {
      openid,
      unionid,
      loginType: userDoc.loginType,
      loginAt: event.loginAt || now.toISOString(),
      createdAt: now
    }
  });

  return {
    success: true,
    data: {
      openid,
      unionid,
      userInfo
    }
  };
};
