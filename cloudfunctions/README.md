# 心依AI 云开发支付配置

本目录提供正式支付和会员状态所需的微信云函数。

## 需要上传的云函数

- `createPayOrder`：创建会员订单并调用微信云支付统一下单
- `payNotify`：接收微信支付回调，写入订单支付状态和会员到期时间
- `getMembershipStatus`：读取当前用户会员状态和免费分析次数
- `recordAnalysisUsage`：成功分析后记录一次免费次数
- `initDatabase`：首次部署时创建会员支付所需数据库集合

## 云数据库集合

在云开发控制台创建这些集合：

- `orders`
- `memberships`
- `analysis_usage`
- `analysis_usage_logs`

建议集合权限设为仅云函数可写。前端不要直接写会员和订单数据。

也可以上传并运行一次 `initDatabase` 云函数自动创建这些集合。

## 云函数环境变量

在 `createPayOrder` 云函数里配置：

- `WX_PAY_SUB_MCH_ID`：微信支付商户号
- `XINYI_CLOUD_ENV_ID`：云开发环境 ID，当前项目为 `cloud1-d8g4ggbvaf81df7c4`

## 微信支付要求

1. 小程序已开通并绑定微信支付商户号
2. 云开发环境已开通云支付能力
3. `payNotify` 云函数已上传部署，供微信支付回调调用

## 金额

金额单位为分：

- 连续包月：`1990`
- 半年会员：`8800`
- 永久会员：`19800`
