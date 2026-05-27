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

function isVipActive(membership) {
  if (!membership) return false;
  if (membership.planKey === 'lifetime') return true;
  return Number(membership.expiresAt || 0) > Date.now();
}

async function setDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).set({ data });
  } catch (error) {
    await db.collection(collection).add({ data: { _id: id, ...data } });
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const membership = await getDoc('memberships', OPENID);
  const usage = await getDoc('analysis_usage', OPENID);
  const todayKey = getTodayKey();
  const currentCount = usage && usage.usageDate === todayKey ? Number(usage.usedCount || 0) : 0;
  const vipActive = isVipActive(membership);
  const usedCount = vipActive || currentCount >= FREE_ANALYSIS_LIMIT ? currentCount : currentCount + 1;

  if (!vipActive && usedCount !== currentCount) {
    await setDoc('analysis_usage', OPENID, {
      openid: OPENID,
      usageDate: todayKey,
      usedCount,
      updatedAt: Date.now()
    });
    await db.collection('analysis_usage_logs').add({
      data: {
        openid: OPENID,
        usageDate: todayKey,
        createdAt: Date.now()
      }
    });
  }

  return {
    success: true,
    data: {
      vip: membership || { active: false, planKey: '', planName: '', expiresAt: 0 },
      usageDate: todayKey,
      usedCount,
      freeLimit: FREE_ANALYSIS_LIMIT,
      remainingFreeCount: Math.max(FREE_ANALYSIS_LIMIT - usedCount, 0),
      canAnalyze: vipActive || usedCount < FREE_ANALYSIS_LIMIT
    }
  };
};
