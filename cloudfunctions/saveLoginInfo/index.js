const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function setDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).set({ data });
  } catch (error) {
    await db.collection(collection).add({ data: { _id: id, ...data } });
  }
}

exports.main = async (event = {}) => {
  const { OPENID, UNIONID } = cloud.getWXContext();
  const userInfo = event.userInfo || {};
  const now = Date.now();
  const loginAt = Number(event.loginAt || now);

  await setDoc('users', OPENID, {
    openid: OPENID,
    unionid: UNIONID || '',
    userInfo: {
      nickName: userInfo.nickName || '',
      avatarUrl: userInfo.avatarUrl || '',
      gender: userInfo.gender || 0,
      country: userInfo.country || '',
      province: userInfo.province || '',
      city: userInfo.city || '',
      language: userInfo.language || ''
    },
    lastLoginAt: loginAt,
    updatedAt: now
  });

  await db.collection('login_logs').add({
    data: {
      openid: OPENID,
      unionid: UNIONID || '',
      loginAt,
      createdAt: now
    }
  });

  return {
    success: true,
    data: {
      openid: OPENID,
      unionid: UNIONID || ''
    }
  };
};
