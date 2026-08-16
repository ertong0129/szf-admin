var assert = require('assert');
var Hub = require('../js/worldhub.js');

var t = 1000;
var hub = Hub.create({ now: function () { return t; } });

hub.upsert('s1', 'a', { name: '甲', mapId: 'wild', x: 100, y: 100, hp: 80, maxHp: 100, pkMode: 'all', nation: 'ming', cls: 'warrior', level: 10 });
hub.upsert('s1', 'b', { name: '乙', mapId: 'wild', x: 120, y: 100, hp: 90, maxHp: 100, pkMode: 'peace', nation: 'yuan', cls: 'archer', level: 10 });

var snap = hub.snapshot('s1', 'a');
assert.strictEqual(snap.players.length, 1);
assert.strictEqual(snap.players[0].user, 'b');
assert.strictEqual(snap.online, 2);

var hit = hub.social('s1', 'a', 'hit', { target: 'b', dmg: 20, safe: false });
assert.ok(hit.ok);
assert.strictEqual(hit.hp, 70);

var peace = Hub.create({ now: function () { return 1; } });
peace.upsert('s1', 'a', { name: '甲', mapId: 'wild', x: 0, y: 0, hp: 50, maxHp: 50, pkMode: 'peace' });
peace.upsert('s1', 'b', { name: '乙', mapId: 'wild', x: 10, y: 0, hp: 50, maxHp: 50, pkMode: 'all' });
var no = peace.social('s1', 'a', 'hit', { target: 'b', dmg: 10, safe: false });
assert.ok(no.error);

var safe = hub.social('s1', 'a', 'hit', { target: 'b', dmg: 10, safe: true });
assert.ok(safe.error);

hub.social('s1', 'a', 'friend_add', { user: 'b' });
var sb = hub.snapshot('s1', 'b');
assert.ok(sb.invites.some(function (i) { return i.kind === 'friend'; }));

hub.social('s1', 'a', 'party_invite', { user: 'b' });
hub.social('s1', 'b', 'party_accept', { user: 'a' });
var pa = hub.snapshot('s1', 'a');
assert.ok(pa.party && pa.party.members.indexOf('b') >= 0);

var nation = Hub.create({ now: function () { return 1; } });
nation.upsert('s1', 'a', { name: '甲', mapId: 'wild', x: 0, y: 0, hp: 50, maxHp: 50, pkMode: 'nation', nation: 'ming' });
nation.upsert('s1', 'b', { name: '乙', mapId: 'wild', x: 10, y: 0, hp: 50, maxHp: 50, pkMode: 'all', nation: 'ming' });
var same = nation.social('s1', 'a', 'hit', { target: 'b', dmg: 5, safe: false });
assert.ok(same.error);
nation.upsert('s1', 'c', { name: '丙', mapId: 'wild', x: 10, y: 0, hp: 50, maxHp: 50, pkMode: 'all', nation: 'yuan' });
var cross = nation.social('s1', 'a', 'hit', { target: 'c', dmg: 5, safe: false });
assert.ok(cross.ok);

hub.social('s1', 'a', 'say', { text: '你好', chan: 'world' });
var sc = hub.snapshot('s1', 'b');
assert.ok(sc.chat.some(function (l) { return l.text === '你好'; }));

hub.social('s1', 'a', 'trade_ask', { user: 'b' });
hub.social('s1', 'b', 'trade_accept', { user: 'a' });
var tr = hub.snapshot('s1', 'a');
assert.ok(tr.trade);

console.log('worldhub.test.js ok');
