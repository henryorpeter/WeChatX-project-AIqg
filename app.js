App({
  globalData: {
    lastResult: null,
    systemInfo: null
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d8g4ggbvaf81df7c4',
        traceUser: true
      });
    }

    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
    const systemSetting = wx.getSystemSetting ? wx.getSystemSetting() : {};

    this.globalData.systemInfo = {
      ...windowInfo,
      ...deviceInfo,
      ...appBaseInfo,
      ...systemSetting
    };
  }
});
