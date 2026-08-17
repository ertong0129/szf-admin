var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hongwu-store-'));
process.env.HONGWU_DATA = dir;
process.env.DB_DRIVER = 'sqlite';

var Store = require('../js/store.js');
var store = Store.open();

assert.strictEqual(store.driver, 'sqlite');
assert.ok(store.getUser('demo'), '应预置 demo 账号');
assert.strictEqual(store.getUser('demo').pass, Store.hash('123456'));

store.createUser('alice', Store.hash('pass1'));
var token = store.issueToken('alice');
assert.strictEqual(store.userByToken(token), 'alice');
assert.strictEqual(store.userByToken('nope'), null);

store.setRole('alice', 's1', { v: 1, player: { name: '阿梨' } });
var role = store.getRole('alice', 's1');
assert.strictEqual(role.player.name, '阿梨');

store.addChat('alice', '你好');
store.addChat('系统', '欢迎');
var lines = store.listChat(10);
assert.ok(lines.length >= 2);
assert.strictEqual(lines[lines.length - 1].text, '欢迎');

store.setKv('bosses', { field: {}, world: null });
assert.deepStrictEqual(store.getKv('bosses').field, {});

var jsonPath = path.join(dir, 'store.json');
fs.writeFileSync(jsonPath, JSON.stringify({
  users: { bob: { pass: Store.hash('x'), roles: { s2: { v: 1 } }, created: 1 } },
  tokens: {},
  chat: [{ who: 'bob', text: '迁', t: 2 }],
  social: { friends: { bob: ['alice'] } },
  bosses: { field: { a: 1 }, world: null }
}));

process.env.HONGWU_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hongwu-store-mig-'));
fs.mkdirSync(process.env.HONGWU_DATA, { recursive: true });
fs.writeFileSync(path.join(process.env.HONGWU_DATA, 'store.json'), JSON.stringify({
  users: { bob: { pass: Store.hash('x'), roles: { s2: { v: 1 } }, created: 1 } },
  tokens: {},
  chat: [{ who: 'bob', text: '迁', t: 2 }],
  social: { friends: { bob: ['alice'] } },
  bosses: { field: { a: 1 }, world: null }
}));

delete require.cache[require.resolve('../js/store.js')];
var Store2 = require('../js/store.js');
var s2 = Store2.open();
assert.ok(s2.getUser('bob'), 'JSON 用户应迁入数据库');
assert.strictEqual(s2.getRole('bob', 's2').v, 1);
assert.ok(s2.getKv('social').friends.bob);
assert.ok(fs.existsSync(path.join(process.env.HONGWU_DATA, 'store.json.migrated')));

console.log('store.test.js ok');
