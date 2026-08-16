# 洪武风云录 · 单机志

个人学习用本地服：大厅选服 + 游戏端 + 可选 Node 服务端。

## 怎么开

仓库根目录下载 `洪武风云录-Windows.zip`，解压后双击 `启动游戏.bat`。

有 Node.js 时会启动 `http://127.0.0.1:8088/`（测试号 `demo` / `123456`）。没有 Node 也可打开 `index.html`，存档只在浏览器。

```bash
cd hongwu-legend
node server.js
```

**走路：** 左键点斜视 3D 地面（黄圈落点并自动寻路）。旧档若卡在房子里，进游戏会自动拉到空地。

网上资料与创作者 demo 见 `docs/REFERENCES.md`。结论：原作是 Flash「3D 建模 + 2D 原画」斜视 ARPG；创作者公开的是 Erlang 学习服 [mgee](https://github.com/qingliangcn/mgee)，不是完整 3D 客户端。本目录用独立 WebGL 画布做 Three.js 斜视场景（房屋、树、立绘、血条、落点），对照该镜头。

## Windows 直接下载

国内（推荐 jsDelivr）：

https://cdn.jsdelivr.net/gh/ertong0129/szf-admin@cursor/hongwu-offline-legend-f2d5/hongwu-windows.zip

备用：

https://gh-proxy.com/https://github.com/ertong0129/szf-admin/raw/cursor/hongwu-offline-legend-f2d5/hongwu-windows.zip

GitHub 原地址：

https://github.com/ertong0129/szf-admin/raw/cursor/hongwu-offline-legend-f2d5/洪武风云录-Windows.zip

## 画面说明

登录壳、加载海报、底栏和角色立绘来自用户提供的 `Main.swf` 同目录公开资源（见 `assets/official/`）。地砖与部分怪物仍用本目录重绘贴图。SWF 整包没有打进仓库。

## 原作简析

[91wan《明朝传奇》](https://www.91wan.com/mccq/) 是广州明朝互动开发的 Flash ARPG 页游。官网与百科可核对到的核心包括：

- **背景**：玩家“穿越”到洪武元年，在大明三百年史与江湖之间成长。
- **职业**：战士（刀剑、血防）、射手（弓矢、远程）、侠客（扇、内功爆发）、医仙（杖、治疗）。
- **战斗**：点击移动的即时战斗；和平 / 全体 / 组队 / 宗族 / 国家 / 善恶等 PK 模式。
- **养成**：属性加点（力 / 智 / 敏 / 精 / 体）、技能树、装备品质（白绿蓝紫橙）、天工炉强化 / 开孔 / 镶嵌灵石、宠物洗灵提悟。
- **日常循环**：自动挂机与自动寻路、主线与循环任务、鄱阳湖等副本、个人 / 宗族押镖、商贸、国战与王座争霸。

原作依赖 Flash，现代浏览器已无法直接进入。完整 MMO（跨服、交易行、宗族国战）也不适合原样搬进单机。

## 单机志范围

本目录实现一条可闭环的单人路线：

| 系统 | 单机实现 |
| --- | --- |
| 四职业即时战斗 | 战士 / 射手 / 侠客 / 医仙，普攻 + 6 个技能 |
| 挂机 | Z 键自动寻敌、放技能、吃药、拾取 |
| 地图 | 太平村、野猪林、神农谷、鄱阳水寨、应天京城、官道押镖、英雄试炼 |
| 养成 | 装备掉落与穿戴、升星、开孔、镶石、草药炼药 |
| 灵宠 | 神农谷收服或向驯兽师请一只，随行攻击 |
| 功业 | 10 条主线：清野、采药、结缘、进京、开炉、水寨、押镖、试炼、世界首领 |
| 存档 | 本机 `localStorage`，标题页可续关 |

未做：充值 / 元宝商城、开箱子、真实多人 PK、宗族与国战、交易行。这些是原作的社交与商业层，不是单人战斗循环所必需。

## 操作

- **WASD / 方向键** 移动，鼠标左键点地寻路、点敌人锁定、点 NPC 对话
- **1–6** 技能，**空格** 普攻，**Q / R** 吃药，**F** 拾取，**Z** 挂机
- **C** 角色 **B** 背包 **V** 技能 **P** 灵宠 **E** 百工炉 **J** 任务 **Esc** 关窗
- 背包左键使用或装备，右键丢弃

## 测试

```bash
node hongwu-legend/tests/formulas.test.js
```
