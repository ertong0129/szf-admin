(function () {
  var API = window.GameAPI;
  var box = document.getElementById('portal-app');
  if (!box || !API) return;

  var state = { view: 'news', servers: [], err: '' };

  var NEWS = [
    '主文件 Main.swf 是 Flex 加载器，真正进游要再拉 MingGame.swf',
    '公开资源：登录切图、加载海报、创角、mingUI / viewUI、角色立绘',
    '左键点地走路。测试号 demo / 123456',
    '创作人学习 demo：qingliangcn/mgee（只有服务端）'
  ];

  function newsHtml() {
    return '<ul>' + NEWS.map(function (t) {
      return '<li>' + t + '</li>';
    }).join('') + '</ul>' +
      (state.err ? '<div class="err">' + state.err + '</div>' : '');
  }

  function serversHtml() {
    var rows = (state.servers || []).map(function (s) {
      return '<button class="server-row" data-sid="' + s.id + '"><b>' + s.name +
        '</b><span>' + (s.status || '火爆') + '</span></button>';
    }).join('');
    return (rows || '<ul><li>没有服务器列表</li></ul>') +
      (state.err ? '<div class="err">' + state.err + '</div>' : '');
  }

  function paint() {
    box.innerHTML = state.view === 'servers' ? serversHtml() : newsHtml();
    box.querySelectorAll('[data-sid]').forEach(function (b) {
      b.onclick = function () {
        location.href = 'play.html?server=' + encodeURIComponent(b.dataset.sid);
      };
    });
  }

  function note(text) {
    var n = document.getElementById('net-note');
    if (n) n.textContent = text;
  }

  function submit(reg) {
    var user = (document.getElementById('login_user').value || '').trim();
    var pass = document.getElementById('login_pass').value;
    var act = reg ? API.register(user, pass) : API.login(user, pass);
    act.then(function () {
      return API.servers();
    }).then(function (j) {
      state.servers = j.servers || [];
      state.view = 'servers';
      state.err = '';
      note('账号 ' + (API.user || user) + '，点下面选服进入');
      paint();
    }).catch(function (e) {
      state.err = e.message || String(e);
      paint();
    });
  }

  var loginBtn = document.getElementById('do-login');
  var regBtn = document.getElementById('do-reg');
  if (loginBtn) loginBtn.onclick = function (ev) { ev.preventDefault(); submit(false); };
  if (regBtn) regBtn.onclick = function (ev) { ev.preventDefault(); submit(true); };
  var form = document.getElementById('frmLogin');
  if (form) {
    form.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); submit(false); }
    });
  }

  paint();
  API.probe().then(function (ok) {
    note(ok ? ('已连接本地服务端 v' + (API.ver || '') + (API.store ? '　库 ' + API.store : '') + '　测试号 demo / 123456') : '未检测到服务端，请先双击启动游戏。存档在本机数据库，不写浏览器');
  });
})();
