const api = require('../../utils/api');
const config = require('../../config');

Page({
  data: {
    paired: false,
    couple: null,
    profile: null,
    inviteCode: '',
    joinCode: '',
    nickname: '',
    periodStarts: ['', '', ''],
    periodForecast: null
  },

  onShow() { this.load(); },
  load() {
    const page = this;
    api.call('profile').then(function (data) {
      const periodStarts = (data.periodStarts || []).slice(-3);
      while (periodStarts.length < 3) periodStarts.unshift('');
      page.setData({
        paired: !!data.couple,
        couple: data.couple,
        profile: data.profile,
        nickname: data.profile ? data.profile.nickname || '' : '',
        periodStarts: periodStarts,
        periodForecast: data.periodForecast || null
      });
    }).catch(function (error) {
      wx.showToast({ title: error.message || '资料加载失败', icon: 'none' });
    });
  },

  createPair() {
    const page = this;
    wx.showLoading({ title: '创建厨房' });
    api.call('createCouple').then(function (data) {
      wx.hideLoading();
      page.setData({ inviteCode: data.inviteCode });
      wx.showModal({
        title: '你们的厨房建好啦',
        content: '邀请码：' + data.inviteCode + '。把它发给另一半，就可以一起开始点餐。',
        confirmText: '复制邀请码',
        success: function (result) {
          if (result.confirm) wx.setClipboardData({ data: data.inviteCode });
          page.load();
        }
      });
    }).catch(function (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '创建失败', icon: 'none' });
    });
  },

  setGender(event) {
    const page = this;
    const gender = event.currentTarget.dataset.gender;
    api.call('setGender', { gender: gender }).then(function () {
      getApp().applyGenderTheme(gender);
      page.load();
      wx.showToast({ title: gender === 'female' ? '已切换淡粉主题' : '已切换淡蓝主题', icon: 'none' });
    }).catch(function (error) { wx.showToast({ title: error.message || '主题切换失败', icon: 'none' }); });
  },

  periodDateChange(event) {
    const periodStarts = this.data.periodStarts.slice();
    periodStarts[Number(event.currentTarget.dataset.index)] = event.detail.value;
    this.setData({ periodStarts: periodStarts });
  },

  savePeriodStarts() {
    const page = this;
    api.call('savePeriodStarts', { periodStarts: this.data.periodStarts }).then(function (data) {
      page.setData({ periodStarts: data.periodStarts, periodForecast: data.periodForecast });
      wx.showToast({ title: '周期记录已保存', icon: 'success' });
    }).catch(function (error) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }); });
  },

  inputCode(event) { this.setData({ joinCode: event.detail.value.toUpperCase() }); },
  inputNickname(event) { this.setData({ nickname: event.detail.value }); },

  joinPair() {
    const page = this;
    const code = this.data.joinCode.trim().toUpperCase();
    if (!code) return wx.showToast({ title: '请输入另一半发来的邀请码', icon: 'none' });
    api.call('joinCouple', { inviteCode: code }).then(function () {
      wx.showToast({ title: '加入成功，欢迎回家', icon: 'success' });
      page.setData({ joinCode: '' });
      page.load();
    }).catch(function (error) {
      wx.showToast({ title: error.message || '邀请码无效', icon: 'none' });
    });
  },

  switchRole() {
    const page = this;
    const role = this.data.profile.role === 'chef' ? 'diner' : 'chef';
    api.call('setRole', { role: role }).then(function () {
      wx.showToast({ title: role === 'chef' ? '切换为厨房主理人' : '切换为今天吃货', icon: 'none' });
      page.load();
    }).catch(function (error) {
      wx.showToast({ title: error.message || '身份切换失败', icon: 'none' });
    });
  },

  saveNickname() {
    const page = this;
    api.call('setNickname', { nickname: this.data.nickname.trim() }).then(function () {
      wx.showToast({ title: '昵称记下来啦', icon: 'success' });
      page.load();
    }).catch(function (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    });
  },

  copyInvite() {
    const code = this.data.couple && this.data.couple.inviteCode;
    if (!code) return;
    wx.setClipboardData({ data: code });
  },

  subscribeReady() {
    const page = this;
    if (!config.orderReadyTemplateId) {
      wx.showModal({
        title: '还差一个微信模板',
        content: '先在微信公众平台申请订阅消息模板，再把模板 ID 配到项目里。小程序内仍会显示饭菜制作状态。',
        showCancel: false
      });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [config.orderReadyTemplateId],
      success: function (result) {
        if (result[config.orderReadyTemplateId] === 'accept') {
          api.call('saveSubscription').then(function () {
            wx.showToast({ title: '出锅提醒已开启', icon: 'success' });
          }).catch(function (error) {
            wx.showToast({ title: error.message || '授权已完成，但保存失败', icon: 'none' });
          });
        } else {
          wx.showToast({ title: '可以稍后再开启提醒', icon: 'none' });
        }
      },
      fail: function () {
        wx.showToast({ title: '订阅请求暂时没有成功', icon: 'none' });
      }
    });
  }
});
