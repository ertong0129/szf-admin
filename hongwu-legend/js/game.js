/**
 * 洪武风云录客户端已按职责拆分（无打包器，浏览器按序加载 IIFE）。
 *
 *   core.js     状态 G、工具、存档
 *   player.js   角色 / 物品 / 坐骑 / 仓库 / 灵宠
 *   world.js    地图 / 碰撞 / 传送
 *   combat.js   战斗 / 掉落 / 死亡 / PK
 *   quest.js    任务 / 寻路追踪 / 建功立业
 *   dungeon.js  副本 / 押镖 / 英雄试炼
 *   sim.js      每帧更新
 *   netplay.js  局域网玩家 / 社交 / 交易 / 摆摊
 *   render.js   2D 绘制 / HUD
 *   ui.js       面板 / 对话 / 商店 / 地图
 *   input.js    键鼠
 *   boot.js     主循环、创角、启动
 *
 * 扩展时把新函数挂到 window.Hongwu（H.xxx），运行时再互相调用即可。
 * 由 play.html 加载，本文件仅作索引，不要再往这里堆逻辑。
 */
