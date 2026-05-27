const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const FREE_ANALYSIS_LIMIT = 3;

async function getDoc(collection, id) {
  try {
    const res = await db.collection(collection).doc(id).get();
    return res.data || null;
  } catch (error) {
    return null;
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
  const { OPENID } = cloud.getWXContext();
  const membership = await getDoc('memberships', OPENID);
  const usage = await getDoc('analysis_usage', OPENID);
  const usedCount = Number(usage && usage.usedCount || 0);
  const vip = formatVip(membership);

  return {
    success: true,
    data: {
      vip,
      usedCount,
      freeLimit: FREE_ANALYSIS_LIMIT,
      remainingFreeCount: Math.max(FREE_ANALYSIS_LIMIT - usedCount, 0),
      canAnalyze: vip.active || usedCount < FREE_ANALYSIS_LIMIT
    }
  };
};
