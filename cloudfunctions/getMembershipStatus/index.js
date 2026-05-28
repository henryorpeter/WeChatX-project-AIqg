const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const FREE_ANALYSIS_LIMIT = 2;

function getTodayKey() {
  const chinaTime = Date.now() + 8 * 60 * 60 * 1000;
  return new Date(chinaTime).toISOString().slice(0, 10);
}

async function getDoc(collection, id) {
  try {
    const res = await db.collection(collection).doc(id).get();
    return res.data || null;
  } catch (error) {
    return null;
  }
}

async function setDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).set({ data });
  } catch (error) {
    await db.collection(collection).add({ data: { _id: id, ...data } });
  }
}

function formatVip(membership) {
  if (!membership) {
    return { active: false, planKey: '', planName: '', expiresAt: 0 };
  }

  if (membership.planKey === 'lifetime') {
    return { ...membership, active: true, expiresAt: 0 };
  }

  const expiresAt = Number(membership.expiresAt || 0);
  return {
    ...membership,
    expiresAt,
    active: expiresAt > Date.now()
  };
}

exports.main = async () => {
  const { OPENID, UNIONID } = cloud.getWXContext();
  const membership = await getDoc('memberships', OPENID);
  const usage = await getDoc('analysis_usage', OPENID);
  const todayKey = getTodayKey();
  const usedCount = usage && usage.usageDate === todayKey ? Number(usage.usedCount || 0) : 0;
  const vip = formatVip(membership);

  if (!usage || usage.usageDate !== todayKey) {
    await setDoc('analysis_usage', OPENID, {
      openid: OPENID,
      usageDate: todayKey,
      usedCount: 0,
      updatedAt: Date.now()
    });
  }

  return {
    success: true,
    data: {
      openid: OPENID,
      unionid: UNIONID || '',
      vip,
      usageDate: todayKey,
      usedCount,
      freeLimit: FREE_ANALYSIS_LIMIT,
      remainingFreeCount: Math.max(FREE_ANALYSIS_LIMIT - usedCount, 0),
      canAnalyze: vip.active || usedCount < FREE_ANALYSIS_LIMIT
    }
  };
};
