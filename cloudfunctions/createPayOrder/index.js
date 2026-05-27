const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const DEFAULT_CLOUD_ENV_ID = 'cloud1-d8g4ggbvaf81df7c4';

const PLANS = {
  monthly: {
    key: 'monthly',
    name: '连续包月',
    amount: 1990,
    durationDays: 31
  },
  halfYear: {
    key: 'halfYear',
    name: '半年会员',
    amount: 8800,
    durationDays: 183
  },
  lifetime: {
    key: 'lifetime',
    name: '永久会员',
    amount: 19800,
    durationDays: 0
  }
};

function createOrderNo() {
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `XY${Date.now()}${random}`;
}

function getCloudEnvId() {
  return process.env.XINYI_CLOUD_ENV_ID || process.env.TCB_ENV || process.env.SCF_NAMESPACE || DEFAULT_CLOUD_ENV_ID;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const plan = PLANS[event.planKey];
  const subMchId = process.env.WX_PAY_SUB_MCH_ID;
  const envId = getCloudEnvId();

  if (!plan) {
    return { success: false, message: '会员套餐不存在' };
  }

  if (!subMchId || !envId) {
    return {
      success: false,
      message: '云支付参数未配置，请在 createPayOrder 云函数环境变量中配置 WX_PAY_SUB_MCH_ID 和 XINYI_CLOUD_ENV_ID。'
    };
  }

  const outTradeNo = createOrderNo();
  const order = {
    openid: OPENID,
    outTradeNo,
    planKey: plan.key,
    planName: plan.name,
    amount: plan.amount,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.collection('orders').add({ data: order });

  try {
    const payResult = await cloud.cloudPay.unifiedOrder({
      body: `心依AI-${plan.name}`,
      outTradeNo,
      spbillCreateIp: '127.0.0.1',
      subMchId,
      totalFee: plan.amount,
      envId,
      functionName: 'payNotify'
    });

    if (payResult.returnCode !== 'SUCCESS' || payResult.resultCode !== 'SUCCESS') {
      await db.collection('orders').where({ outTradeNo }).update({
        data: {
          status: 'failed',
          failReason: payResult.returnMsg || payResult.errCodeDes || '统一下单失败',
          updatedAt: Date.now()
        }
      });
      return { success: false, message: payResult.returnMsg || payResult.errCodeDes || '统一下单失败' };
    }

    await db.collection('orders').where({ outTradeNo }).update({
      data: {
        prepayId: payResult.payment && payResult.payment.package,
        updatedAt: Date.now()
      }
    });

    return {
      success: true,
      data: {
        orderNo: outTradeNo,
        planKey: plan.key,
        amount: plan.amount,
        payment: payResult.payment
      }
    };
  } catch (error) {
    await db.collection('orders').where({ outTradeNo }).update({
      data: {
        status: 'failed',
        failReason: error.message || '统一下单异常',
        updatedAt: Date.now()
      }
    });
    return { success: false, message: error.message || '统一下单异常' };
  }
};
