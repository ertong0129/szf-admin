/**
 * 以后接 MySQL：
 *   npm i mysql2
 *   DB_DRIVER=mysql
 *   DATABASE_URL=mysql://用户:密码@127.0.0.1:3306/hongwu
 * 表结构与 js/store.js 的 SQLite 库相同（users / roles / tokens / chat / kv）。
 */
function open() {
  var url = process.env.DATABASE_URL || process.env.DB_URL || '';
  throw new Error(
    '尚未接入 MySQL。请在 js/store-mysql.js 用 mysql2 实现 open()，并设置 DB_DRIVER=mysql' +
    (url ? '（当前 DATABASE_URL 已提供）' : '')
  );
}

module.exports = { open: open };
