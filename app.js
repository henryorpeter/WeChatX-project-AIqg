App({
  globalData: {
    lastResult: null,
    systemInfo: null
  },

  onLaunch() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
      }
    });
  }
});
