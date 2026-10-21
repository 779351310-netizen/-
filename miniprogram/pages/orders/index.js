const api = require('../../utils/api');

const labels = { new: '等厨房接单', cooking: '正在制作', ready: '饭菜做好啦', done: '一起开饭' };

Page({
  data: { orders: [], role: 'diner', paired: false, loading: true, gender: 'female' },

  onShow() { this.load(); },
  onPullDownRefresh() {
    this.load().finally(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    const page = this;
    this.setData({ loading: true });
    return api.call('orders').then(function (data) {
      page.setData({ loading: false, orders: data.orders || [], role: data.profile ? data.profile.role : 'diner', paired: !!data.couple, gender: data.profile ? data.profile.gender || 'female' : 'female' });
    }).catch(function (error) {
      page.setData({ loading: false });
      wx.showToast({ title: error.message || '订单加载失败', icon: 'none' });
    });
  },

  updateStatus(event) {
    const page = this;
    const orderId = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status;
    wx.showLoading({ title: '更新订单' });
    api.call('updateOrder', { orderId: orderId, status: status }).then(function (result) {
      wx.hideLoading();
      wx.showToast({ title: status === 'ready' ? '已经通知另一半啦' : '订单状态已更新', icon: 'none' });
      if (result && result.notice === 'not-configured') {
        wx.showModal({
          title: '订单已标记做好',
          content: '微信订阅消息模板还没有配置。对方打开小程序或下拉刷新订单页即可看到状态。',
          showCancel: false
        });
      }
      page.load();
    }).catch(function (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '更新失败', icon: 'none' });
    });
  }
});
