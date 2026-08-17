/**
 * 客户端 API：账号与存档一律走本机服务端数据库，浏览器不落盘。
 * 登录令牌只放在当前标签页的 sessionStorage，关掉标签即失效。
 */
(function (root) {
  var TOKEN_KEY = 'hongwu-token';
  var USER_KEY = 'hongwu-user';
  var mem = { token: '', user: '' };

  function sessionGet(k) {
    try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; }
  }
  function sessionSet(k, v) {
    try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ }
  }
  function wipeLocalSaves() {
    try {
      var keys = [];
      var i;
      for (i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('hongwu-legend-save') === 0 || k === 'hongwu-boss-state' ||
            k === 'hongwu-token' || k === 'hongwu-user' || k === 'hongwu-server')) {
          keys.push(k);
        }
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  }
  wipeLocalSaves();
  mem.token = sessionGet(TOKEN_KEY);
  mem.user = sessionGet(USER_KEY);

  var API = { online: false, user: mem.user, token: mem.token, store: '' };

  function remember(user, token) {
    API.token = token;
    API.user = user;
    sessionSet(TOKEN_KEY, token);
    sessionSet(USER_KEY, user);
  }

  function req(method, url, body) {
    return fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Token': API.token || ''
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || '请求失败');
        return j;
      });
    });
  }

  API.probe = function () {
    return fetch('/api/ping').then(function (r) { return r.json(); }).then(function (j) {
      API.online = true;
      API.ver = (j && j.v) || '';
      API.store = (j && j.store) || '';
      return true;
    }).catch(function () {
      API.online = false;
      return false;
    });
  };

  API.register = function (user, pass) {
    return req('POST', '/api/register', { user: user, pass: pass }).then(function (j) {
      remember(user, j.token);
      return j;
    });
  };

  API.login = function (user, pass) {
    return req('POST', '/api/login', { user: user, pass: pass }).then(function (j) {
      remember(user, j.token);
      return j;
    });
  };

  API.servers = function () {
    if (!API.online) return Promise.reject(new Error('请先启动本地服务端'));
    return req('GET', '/api/servers');
  };

  API.loadRole = function (server) {
    if (!API.online) return Promise.reject(new Error('请先启动本地服务端'));
    return req('GET', '/api/role?server=' + encodeURIComponent(server));
  };

  API.saveRole = function (server, payload) {
    if (!API.online) return Promise.reject(new Error('请先启动本地服务端'));
    return req('POST', '/api/role', { server: server, payload: payload });
  };

  API.chatSend = function (text) {
    if (!API.online) return Promise.reject(new Error('请先启动本地服务端'));
    return req('POST', '/api/chat', { text: text });
  };

  API.chatList = function () {
    if (!API.online) return Promise.resolve({ lines: [] });
    return req('GET', '/api/chat');
  };

  API.worldTick = function (body) {
    if (!API.online || !API.token) return Promise.resolve(null);
    return req('POST', '/api/world', body);
  };

  API.social = function (op, extra) {
    if (!API.online || !API.token) return Promise.resolve({ error: '离线' });
    var body = Object.assign({ op: op }, extra || {});
    return req('POST', '/api/social', body);
  };

  API.bosses = function () {
    if (!API.online) return Promise.reject(new Error('请先启动本地服务端'));
    return req('GET', '/api/bosses');
  };

  API.bossOp = function (op, extra) {
    if (!API.online || !API.token) return Promise.resolve({ local: true });
    return req('POST', '/api/bosses', Object.assign({ op: op }, extra || {}));
  };

  root.GameAPI = API;
})(typeof window !== 'undefined' ? window : global);
