/**
 * 客户端 API：有服务端则走 HTTP，否则退回 localStorage。
 */
(function (root) {
  var TOKEN_KEY = 'hongwu-token';
  var USER_KEY = 'hongwu-user';
  var API = { online: false, user: localStorage.getItem(USER_KEY) || '', token: localStorage.getItem(TOKEN_KEY) || '' };

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
    return fetch('/api/ping').then(function (r) { return r.json(); }).then(function () {
      API.online = true;
      return true;
    }).catch(function () {
      API.online = false;
      return false;
    });
  };

  API.register = function (user, pass) {
    return req('POST', '/api/register', { user: user, pass: pass }).then(function (j) {
      API.token = j.token; API.user = user;
      localStorage.setItem(TOKEN_KEY, j.token);
      localStorage.setItem(USER_KEY, user);
      return j;
    });
  };

  API.login = function (user, pass) {
    return req('POST', '/api/login', { user: user, pass: pass }).then(function (j) {
      API.token = j.token; API.user = user;
      localStorage.setItem(TOKEN_KEY, j.token);
      localStorage.setItem(USER_KEY, user);
      return j;
    });
  };

  API.servers = function () {
    if (!API.online) {
      return Promise.resolve({
        servers: [
          { id: 's1', name: '双线1服 · 洪武风云', status: '火爆' },
          { id: 's2', name: '双线2服 · 永乐新章', status: '畅通' }
        ]
      });
    }
    return req('GET', '/api/servers');
  };

  API.loadRole = function (server) {
    if (!API.online) return Promise.resolve({ role: null });
    return req('GET', '/api/role?server=' + encodeURIComponent(server));
  };

  API.saveRole = function (server, payload) {
    if (!API.online) return Promise.resolve({ ok: true, local: true });
    return req('POST', '/api/role', { server: server, payload: payload });
  };

  API.chatSend = function (text) {
    if (!API.online) return Promise.resolve({ ok: true });
    return req('POST', '/api/chat', { text: text });
  };

  API.chatList = function () {
    if (!API.online) return Promise.resolve({ lines: [] });
    return req('GET', '/api/chat');
  };

  root.GameAPI = API;
})(typeof window !== 'undefined' ? window : global);
