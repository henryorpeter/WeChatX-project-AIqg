const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const PLANS = {
  monthly: {
    key: 'monthly',
    name: '连续包月',
    durationDays: 31
  },
  halfYear: {
    key: 'halfYear',
    name: '半年会员',
    durationDays: 183
  },
  lifetime: {
    key: 'lifetime',
    name: '永久会员',
    durationDays: 0
  }
};

function isPaidEvent(event) {
  const returnCode = event.returnCode || event.return_code;
  const resultCode = event.resultCode || event.result_code;
  return returnCode === 'SUCCESS' && (!resultCode || resultCode === 'SUCCESS');
}

async function getOrder(outTradeNo) {
  const res = await db.collection('orders').where({ outTradeNo }).limit(1).get();
  return res.data && res.data[0] || null;
}

async function setMembership(openid, plan, paidAt) {
  const expiresAt = plan.key === 'lifetime' ? 0 : paidAt + plan.durationDays * 24 * 60 * 60 * 1000;
  const data = {
    openid,
    planKey: plan.key,
    planName: plan.name,
    active: true,
    startedAt: paidAt,
    expiresAt,
    updatedAt: paidAt
  };

  try {
    await db.collection('memberships').doc(openid).set({ data });
  } catch (error) {
    await db.collection('memberships').add({ data: { _id: openid, ...data } });
  }
}

exports.main = async (event = {}) => {
  const outTradeNo = event.outTradeNo || event.out_trade_no;
  const transactionId = event.transactionId || event.transaction_id || '';

  if (!isPaidEvent(event) || !outTradeNo) {
    return { errcode: 0 };
  }

  const order = await getOrder(outTradeNo);
  if (!order || order.status === 'paid') {
    return { errcode: 0 };
  }

  const plan = PLANS[order.planKey];
  if (!plan) {
    return { errcode: 0 };
  }

  const paidAt = Date.now();

  await db.collection('orders').where({ outTradeNo }).update({
    data: {
      status: 'paid',
      transactionId,
      paidAt,
      updatedAt: paidAt,
      payEvent: event
    }
  });

  await setMembership(order.openid, plan, paidAt);

  return { errcode: 0 };
};
