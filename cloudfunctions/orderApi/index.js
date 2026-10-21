const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const READY_TEMPLATE_ID = '';

function now() { return new Date().toISOString(); }
function fail(message) { const error = new Error(message); error.publicMessage = message; throw error; }

async function getUser(openid) {
  try { return (await db.collection('users').doc(openid).get()).data; }
  catch (_) { return null; }
}

async function requireProfile(openid) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) fail('先创建或加入你们的小厨房。');
  const coupleResult = await db.collection('couples').doc(user.coupleId).get();
  return { user: user, couple: coupleResult.data };
}

async function photoUrls(rows) {
  const fileIDs = [];
  rows.forEach(function (row) {
    if (row.photoFileID) fileIDs.push(row.photoFileID);
    (row.items || []).forEach(function (item) { if (item.photoFileID) fileIDs.push(item.photoFileID); });
  });
  const unique = Array.from(new Set(fileIDs));
  if (!unique.length) return rows;
  let result;
  try { result = await cloud.getTempFileURL({ fileList: unique }); }
  catch (_) { return rows; }
  const urlMap = {};
  (result.fileList || []).forEach(function (file) { urlMap[file.fileID] = file.tempFileURL; });
  return rows.map(function (row) {
    const next = Object.assign({}, row, { photoUrl: row.photoFileID ? urlMap[row.photoFileID] || '' : '' });
    if (row.items) next.items = row.items.map(function (item) {
      return Object.assign({}, item, { photoUrl: item.photoFileID ? urlMap[item.photoFileID] || '' : '' });
    });
    return next;
  });
}

function decorateOrders(rows) {
  const labels = { new: '等厨房接单', cooking: '正在制作', ready: '饭菜做好啦', done: '一起开饭' };
  return rows.map(function (order) {
    const createdAt = new Date(order.createdAt);
    return Object.assign({}, order, {
      statusLabel: labels[order.status] || '订单',
      timeLabel: isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      summary: (order.items || []).map(function (item) { return item.name + ' ×' + item.quantity; }).join('、')
    });
  });
}

async function home(openid) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) return { profile: user || null, couple: null, dishes: [], orders: [] };
  const couple = (await db.collection('couples').doc(user.coupleId).get()).data;
  const dishResult = await db.collection('dishes').where({ coupleId: user.coupleId, isAvailable: true }).limit(30).get();
  const orderResult = await db.collection('orders').where({ coupleId: user.coupleId }).orderBy('createdAt', 'desc').limit(5).get();
  const togetherDays = couple.anniversaryDate ? Math.max(0, Math.floor((Date.now() - new Date(couple.anniversaryDate).getTime()) / 86400000)) : 0;
  return {
    profile: user,
    couple: Object.assign({}, couple, { memberCount: (couple.members || []).length, daysTogether: togetherDays }),
    dishes: await photoUrls(dishResult.data),
    orders: decorateOrders(await photoUrls(orderResult.data))
  };
}

async function menu(openid) {
  const access = await requireProfile(openid);
  const result = await db.collection('dishes').where({ coupleId: access.user.coupleId }).orderBy('createdAt', 'desc').limit(100).get();
  return { profile: access.user, couple: access.couple, dishes: await photoUrls(result.data) };
}

async function orders(openid) {
  const access = await requireProfile(openid);
  const result = await db.collection('orders').where({ coupleId: access.user.coupleId }).orderBy('createdAt', 'desc').limit(50).get();
  return { profile: access.user, couple: access.couple, orders: decorateOrders(await photoUrls(result.data)) };
}

async function profile(openid) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) return { profile: user || null, couple: null };
  const couple = (await db.collection('couples').doc(user.coupleId).get()).data;
  return { profile: user, couple: Object.assign({}, couple, { memberCount: (couple.members || []).length }) };
}

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function createCouple(openid) {
  const existing = await getUser(openid);
  if (existing && existing.coupleId) fail('你已经在一个小厨房里啦。');
  let code = makeInviteCode();
  for (let i = 0; i < 3; i += 1) {
    const collision = await db.collection('couples').where({ inviteCode: code }).limit(1).get();
    if (!collision.data.length) break;
    code = makeInviteCode();
  }
  const created = await db.collection('couples').add({
    data: { members: [openid], ownerOpenid: openid, partnerOpenid: '', inviteCode: code, anniversaryDate: '', createdAt: now() }
  });
  await db.collection('users').doc(openid).set({
    data: { coupleId: created._id, role: 'chef', nickname: '厨房主理人', readyGrantCount: 0, createdAt: now() }
  });
  return { coupleId: created._id, inviteCode: code };
}

async function joinCouple(openid, inviteCode) {
  const existing = await getUser(openid);
  if (existing && existing.coupleId) fail('你已经在一个小厨房里啦。');
  const result = await db.collection('couples').where({ inviteCode: String(inviteCode || '').trim().toUpperCase() }).limit(1).get();
  if (!result.data.length) fail('邀请码不对，再检查一下吧。');
  const couple = result.data[0];
  if ((couple.members || []).indexOf(openid) >= 0) fail('你已经加入这个厨房啦。');
  if ((couple.members || []).length >= 2) fail('这个小厨房已经有两位成员啦。');
  await db.collection('couples').doc(couple._id).update({
    data: { members: _.push(openid), partnerOpenid: openid, updatedAt: now() }
  });
  await db.collection('users').doc(openid).set({
    data: { coupleId: couple._id, role: 'diner', nickname: '今天吃货', readyGrantCount: 0, createdAt: now() }
  });
  return { coupleId: couple._id };
}

async function saveDish(openid, event) {
  const access = await requireProfile(openid);
  if (access.user.role !== 'chef') fail('切换到厨房主理人后才能管理菜单。');
  const name = String(event.name || '').trim().slice(0, 24);
  if (!name) fail('菜品名字不能为空。');
  const data = {
    coupleId: access.user.coupleId,
    name: name,
    category: String(event.category || '其他').slice(0, 12),
    minutes: Math.max(1, Math.min(600, Number(event.minutes) || 30)),
    description: String(event.description || '').trim().slice(0, 120),
    photoFileID: String(event.photoFileID || ''),
    isAvailable: event.isAvailable !== false,
    updatedAt: now()
  };
  if (event.dishId) {
    const old = (await db.collection('dishes').doc(event.dishId).get()).data;
    if (!old || old.coupleId !== access.user.coupleId) fail('没有权限修改这道菜。');
    await db.collection('dishes').doc(event.dishId).update({ data: data });
    return { dishId: event.dishId };
  }
  data.createdBy = openid;
  data.createdAt = now();
  const created = await db.collection('dishes').add({ data: data });
  return { dishId: created._id };
}

async function createOrder(openid, event) {
  const access = await requireProfile(openid);
  const rawItems = Array.isArray(event.items) ? event.items : [];
  if (!rawItems.length || rawItems.length > 30) fail('先挑几道菜再下单吧。');
  const items = [];
  for (const entry of rawItems) {
    const dishResult = await db.collection('dishes').doc(entry.dishId).get();
    const dish = dishResult.data;
    if (!dish || dish.coupleId !== access.user.coupleId || !dish.isAvailable) fail('有菜品暂时不能点，请刷新菜单。');
    const quantity = Math.max(1, Math.min(20, Number(entry.quantity) || 1));
    items.push({
      dishId: dish._id, name: dish.name, category: dish.category,
      photoFileID: dish.photoFileID || '', quantity: quantity, description: dish.description || ''
    });
  }
  const created = await db.collection('orders').add({
    data: {
      coupleId: access.user.coupleId,
      placedBy: openid,
      items: items,
      note: String(event.note || '').trim().slice(0, 100),
      status: 'new',
      createdAt: now(),
      updatedAt: now()
    }
  });
  return { orderId: created._id };
}

async function sendReadyMessage(openid, couple, order) {
  if (!READY_TEMPLATE_ID) return 'not-configured';
  const receiver = (couple.members || []).find(function (member) { return member !== openid; });
  if (!receiver) return 'no-partner';
  const receiverUser = await getUser(receiver);
  if (!receiverUser || !receiverUser.readyGrantCount) return 'no-subscription';
  try {
    const dishNames = (order.items || []).slice(0, 2).map(function (item) { return item.name; }).join('、');
    await cloud.openapi.subscribeMessage.send({
      touser: receiver,
      templateId: READY_TEMPLATE_ID,
      page: 'pages/orders/index',
      data: {
        thing1: { value: (dishNames || '你点的饭菜') + '做好啦' },
        time2: { value: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) }
      },
      miniprogramState: 'developer',
      lang: 'zh_CN'
    });
    await db.collection('users').doc(receiver).update({ data: { readyGrantCount: _.inc(-1) } });
    return 'sent';
  } catch (error) {
    console.warn('订阅提醒发送失败：', error);
    return 'send-failed';
  }
}

async function updateOrder(openid, event) {
  const access = await requireProfile(openid);
  const orderResult = await db.collection('orders').doc(event.orderId).get();
  const order = orderResult.data;
  if (!order || order.coupleId !== access.user.coupleId) fail('找不到这份订单。');
  const next = String(event.status || '');
  const transitions = { new: ['cooking'], cooking: ['ready'], ready: ['done'], done: [] };
  if (!(transitions[order.status] || []).includes(next)) fail('订单状态已变化，请刷新后再试。');
  if (next !== 'done' && access.user.role !== 'chef') fail('只有厨房主理人可以更新制作状态。');
  await db.collection('orders').doc(event.orderId).update({ data: { status: next, updatedAt: now() } });
  const notice = next === 'ready' ? await sendReadyMessage(openid, access.couple, order) : '';
  return { orderId: event.orderId, status: next, notice: notice };
}

async function saveSubscription(openid) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) fail('先加入小厨房，再开启提醒。');
  await db.collection('users').doc(openid).update({ data: { readyGrantCount: _.inc(1) } });
  return { readyGrantCount: (user.readyGrantCount || 0) + 1 };
}

async function setRole(openid, role) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) fail('先加入小厨房。');
  if (!['chef', 'diner'].includes(role)) fail('身份设置无效。');
  await db.collection('users').doc(openid).update({ data: { role: role } });
  return { role: role };
}

async function setNickname(openid, nickname) {
  const user = await getUser(openid);
  if (!user || !user.coupleId) fail('先加入小厨房。');
  const value = String(nickname || '').trim().slice(0, 10);
  if (!value) fail('昵称不能为空。');
  await db.collection('users').doc(openid).update({ data: { nickname: value } });
  return { nickname: value };
}

exports.main = async function (event) {
  const openid = cloud.getWXContext().OPENID;
  try {
    let data;
    switch (event.action) {
      case 'home': data = await home(openid); break;
      case 'menu': data = await menu(openid); break;
      case 'orders': data = await orders(openid); break;
      case 'profile': data = await profile(openid); break;
      case 'createCouple': data = await createCouple(openid); break;
      case 'joinCouple': data = await joinCouple(openid, event.inviteCode); break;
      case 'saveDish': data = await saveDish(openid, event); break;
      case 'createOrder': data = await createOrder(openid, event); break;
      case 'updateOrder': data = await updateOrder(openid, event); break;
      case 'saveSubscription': data = await saveSubscription(openid); break;
      case 'setRole': data = await setRole(openid, event.role); break;
      case 'setNickname': data = await setNickname(openid, event.nickname); break;
      default: fail('暂不支持这个操作。');
    }
    return { ok: true, data: data };
  } catch (error) {
    return { ok: false, message: error.publicMessage || error.message || '服务暂时不可用。' };
  }
};
