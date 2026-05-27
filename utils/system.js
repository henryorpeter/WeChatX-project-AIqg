function getWindowInfo() {
  if (wx.getWindowInfo) {
    return wx.getWindowInfo();
  }
  return {};
}

function getStatusLayout(extraTopPx) {
  const info = getWindowInfo();
  const statusBarHeight = info.statusBarHeight || 0;
  return {
    statusBarHeight,
    pageTop: statusBarHeight + extraTopPx,
    recordTop: statusBarHeight + 8
  };
}

module.exports = {
  getWindowInfo,
  getStatusLayout
};
