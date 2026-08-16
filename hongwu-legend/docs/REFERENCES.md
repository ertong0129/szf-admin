# 网上能查到的原作与学习资料

网上能公开核对到的，主要是新闻评测、官网介绍，以及创作人后来公开的 **Erlang 服务端学习 demo**。没有找到《明朝传奇》官方完整客户端或 Flash 场景源码的合法公开包。

## 原作画面到底是不是 3D

公开新闻写的是：**Flash 页游，3D 建模 + 2D 原画结合**。

- [17173 / 页游网 2010-11：绿色首创，史诗原画曝光](http://web.17173.com/content/2010-11-25/20101125162806768.shtml)
- [叶子猪评测：画面由 3D 技术与 2D 原画结合，立体而写实](http://webgame.yzz.cn/yiqipingyouxi/201104/289867.shtml)
- 官网入口：[91wan 明朝传奇](https://www.91wan.com/mccq/)、[4399 专区](https://web.4399.com/mccq/)、[明朝互动产品页](https://mingchao.com/webgame.html)

百科多标注画面为 FLASH。玩家看到的是预渲染立体角色贴在斜视场景上，镜头基本固定，**不是**现在这种自由旋转的真 3D 端游。本学习服用 Three.js 斜视镜头 + 立体房屋树木 + 立绘广告牌，就是在还原这一套。

## 创作人分享过的简易 demo：mgee

就是这个。明朝互动相关开发者 **qingliangcn** 后来公开了 2010 年元旦前后写的 Erlang 服务端学习 demo：

- 仓库：https://github.com/qingliangcn/mgee （约 377 star）
- 全称：mingchao game engine of erlang version
- 作者原文：[知乎 · 为什么一些网页游戏喜欢用 Erlang 做服务端](https://www.zhihu.com/question/20405300/answer/45747560)  
  转载：[CSDN](https://blog.csdn.net/libaineu2004/article/details/77981187)、[掘金](https://juejin.cn/post/6963589703526252551)

作者自己写的经过：

1. 团队四人在 2010.1.1 加班，参考 RabbitMQ 搭框架，用 protobuf 做协议。
2. 两三周做出：**创建角色、登录、场景、组队、怪物、战斗**。
3. 这个 demo 就叫 mgee；有学校拿它当 Erlang 课教材。
4. 压测大约 500 在线后，才继续做成后来的《明朝传奇》（文中写最高约 3100 在线）。
5. **只有服务端**，没有完整 Flash 3D 客户端。监听 843 是当年 Flash 安全沙箱端口。

公开目录里能对照的模块（只作结构参考，**不整包拷进本仓库**）：

| 模块 | 作用 |
| --- | --- |
| `mgee_account` / `mgee_auth` / `mgee_role` | 账号、登录、角色 |
| `mgee_virtual_world` | 场景 / 虚拟世界 |
| `mgee_move` | 移动 |
| `mgee_chat` | 聊天 |
| `game_mod/mod_fight` `mod_skill` `mod_equip` `mod_team` | 战斗、技能、装备、组队 |
| `config` | 技能和地图配置（作者写明给前端用） |
| `doc/设计文档` | EAP 设计文档，需 Enterprise Architect 打开 |

作者注明：部分第三方文件版权需自行处理，代码未美化，离商业化很远。因此本仓库只对照它的模块划分（登录 / 选角 / 场景 / 战斗 / 存档）来做 Node 学习服，不复制其源码或资源。

## 其它可对照的开源 RPG demo

| 项目 | 说明 |
| --- | --- |
| [three-pathfinding](https://github.com/donmccurdy/three-pathfinding) | Three.js 点地寻路 |
| [MDN Three.js 基础 demo](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js) | 场景 / 相机 / 光照 |
| [ET-LegendDemo](https://gitee.com/Leng-ET/ET-LegendDemo) | Unity 传奇向登录、背包、数值（C#，体量很大） |
| [EB163 Flash RPG Demo](https://www.iteye.com/blog/fis-804684) | 早期 Flash 页游开源演示（地图编辑 + A*） |

未找到《明朝传奇》官方完整客户端或 Flash 场景源码的合法公开包。画面贴图仍用本目录原创资源，不用 91wan 的 JPG/SWF。
