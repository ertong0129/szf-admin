# 从「官网 + 主 SWF」复刻 Flash 页游

只给你两个入口时，不要一上来反编译 ActionScript，也不要去解协议 / 加密模块。稳定做法是：**加载器分析 → 公开资源编目 → 数据表抽出 → HTML5 重写逻辑**。

本目录已用这条管线处理 [91wan《明朝传奇》](https://www.91wan.com/mccq/)：

- 官网：`https://www.91wan.com/mccq/`
- 主 SWF：`http://mccq.static.mingchao.com/55598/Main.swf`

学习用复刻客户端在 `game/`，分析工具在 `tools/`。SWF 整包不入库。

## Windows 下载（v20260817d）

解压后双击 `启动游戏.bat` 或 `start.bat`。登录页应显示 **v20260817d**。没有这个版本号就是旧包，请删掉解压目录后重新下载。

GitHub 直链：

https://github.com/ertong0129/szf-admin/raw/cursor/flash-remake-pipeline-d4e1/daming-windows.zip

国内备用：

https://cdn.jsdelivr.net/gh/ertong0129/szf-admin@cursor/flash-remake-pipeline-d4e1/daming-windows.zip

https://gh-proxy.com/https://github.com/ertong0129/szf-admin/raw/cursor/flash-remake-pipeline-d4e1/daming-windows.zip

没有 Node 时会自动改用 Python 或 Windows 自带的 PowerShell。黑色窗口不要关。

## 怎么玩（本机源码）

```bash
cd flash-remake/game
node server.js
```

浏览器打开 http://127.0.0.1:8088/ 。登录页应显示 **v20260817d**。账号随意（默认 `demo`）。

- 左键点地行走，点 NPC 对话，点怪攻击
- **1–6** 技能，**Z** 挂机，**Q/R** 吃药，**F** 拾取
- **C** 角色 **B** 背包 **V** 技能 **P** 灵宠 **E** 天工炉 **M** 地图传送
- 点右侧功业可自动寻路到任务 NPC；找车夫可换图

存档在浏览器 `localStorage`。

## 方案（为什么是这条）

Flash 页游通常是「小加载器 + 大模块包 + CDN 位图 / 数据表」：

| 做法 | 适用 | 问题 |
| --- | --- | --- |
| Ruffle 直接播原 SWF | 单机小游戏 | 网游还要原服；现代浏览器无官方 Flash |
| 反编译 ABC / 解加密 | 看起来快 | 易踩加密（本作用 `cmodule.encrypt`）、版权与协议红线，维护成本极高 |
| **公开资源编目 + 逻辑重写** | 页游 MMO | 要自己做玩法，但可长期运行、可改、不依赖死服 |

`Main.swf` 实测是 **Flex 4 压缩加载器**，舞台 **500×375** @30fps，约 110KB，不是游戏本体。它再去拉：

- `MingGame.swf` 局内主包（约 2.4MB，舞台 500×375 @24fps）
- `assets/createRoleCQ2.swf` 创角（**1002×580**）
- `com/assets/viewUI/viewUI.swf` HUD 切图（人物框 174×86、底栏 978×68）
- `com/maps/world.swf` 540×315、`country.swf` 446×315
- `com/data/pos.txt` 场景坐标、`npc_data.txt` / `missions.txt`（zlib + AMF3）

登录壳 `assets/login.swf`、`assets/configure.xml` 已 403。局内 HTML 常用 **1000×600** 等比 contain，HUD 按切图像素叠，不单独拉长。

**不做：** 反编译 DoABC、破解 `FSM_unEncrySWF`、对接官方 socket。逻辑全部在 `game/js/game.js` 重写。数值与任务取公开表的前十几条主线作学习闭环。

## 管线命令

把官网 HTML 和 `Main.swf` 放到一个目录后：

```bash
cd flash-remake/tools
python3 discover.py https://www.91wan.com/mccq/
python3 swf_inspect.py /path/Main.swf /path/MingGame.swf -o inspect.json
python3 extract_images.py /path/viewUI.swf /path/world.swf -o img
python3 parse_pos.py /path/pos.txt -o pos.json
python3 parse_amf.py /path/npc_data.txt /path/missions.txt -o amf.json
python3 build_catalog.py --src /path/dump --out ../catalog
python3 test_tools.py
```

`pos.txt` 是 20 字节大端记录：`type, mapId, ref, x, y`。`type=4` 为 NPC，坐标索引 `ref - mapId*1000 - 100` 对应该图按 id 排序的 NPC。`type=5` 为刷怪点。

## 已复刻范围

- 四职业创角、点击移动、挂机、技能、背包、强化、灵宠
- 太平村 / 横涧山 / 神农架 / 应天京城 / 开封 / 鄱阳湖（公开 smallMap 俯视图）
- 世界图 / 国家图、车夫与地图传送
- 公开主线前 10 条（历史的召唤 → 收藏游戏）
- 原作 HUD 切图：底栏、人物框、小地图玉框、对话条

未做：真实充值、宗族国战、跨服、完整 2000+ 任务。
