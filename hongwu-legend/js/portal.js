(function () {
  var API = window.GameAPI;
  var box = document.getElementById('portal-app');
  if (!box) return;

  var state = { view: 'login', servers: [], err: '' };

  function el(html) {
    box.innerHTML = html;
  }

  function paint() {
    if (state.view === 'login') {
      el(
        '<div class="portal-card">' +
          '<div class="portal-brand">明朝传奇 · 学习服</div>' +
          '<p class="portal-sub">登录后选服进入。测试号 demo / 123456</p>' +
          '<label>账号</label><input id="u" maxlength="16" value="demo" />' +
          '<label>密码</label><input id="p" type="password" maxlength="20" value="123456" />' +
          '<div class="err" id="err">' + (state.err || '') + '</div>' +
          '<div class="btn-row">' +
            '<button class="btn" id="do-login">进入游戏大厅</button>' +
            '<button class="btn ghost" id="do-reg">注册</button>' +
          '</div>' +
          '<p class="portal-note" id="net-note">正在检测本地服务端…</p>' +
        '</div>'
      );
      document.getElementById('do-login').onclick = function () { submit(false); };
      document.getElementById('do-reg').onclick = function () { submit(true); };
    } else {
      var rows = state.servers.map(function (s) {
        return '<button class="server-row" data-sid="' + s.id + '"><b>' + s.name +
          '</b><span>' + s.status + '</span></button>';
      }).join('');
      el(
        '<div class="portal-card wide">' +
          '<div class="portal-brand">选择服务器</div>' +
          '<p class="portal-sub">账号：' + (API.user || '') + '　单击进入</p>' +
          '<div class="server-list">' + rows + '</div>' +
          '<div class="btn-row"><button class="btn ghost" id="back-login">返回登录</button></div>' +
        '</div>'
      );
      box.querySelectorAll('[data-sid]').forEach(function (b) {
        b.onclick = function () {
          location.href = 'play.html?server=' + encodeURIComponent(b.dataset.sid);
        };
      });
      document.getElementById('back-login').onclick = function () {
        state.view = 'login'; paint();
      };
    }
  }

  function submit(reg) {
    var user = document.getElementById('u').value.trim();
    var pass = document.getElementById('p').value;
    var act = reg ? API.register(user, pass) : API.login(user, pass);
    act.then(function () {
      return API.servers();
    }).then(function (j) {
      state.servers = j.servers || [];
      state.view = 'servers';
      state.err = '';
      paint();
    }).catch(function (e) {
      state.err = e.message || String(e);
      paint();
    });
  }

  paint();
  API.probe().then(function (ok) {
    var n = document.getElementById('net-note');
    if (n) n.textContent = ok ? '已连接本地服务端' : '未检测到服务端，将使用浏览器本地存档（请运行 启动游戏.bat 或 node server.js）';
  });
})();
