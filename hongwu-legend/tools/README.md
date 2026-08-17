# Flash 分析工具（本机 SWF / MCM，不入库）

公开 CDN 上的 `MingGame.swf` 和 `com/maps/mcm/*.mcm` **不要提交进 git**。
下载到 `/tmp` 后用这里的脚本看 ABC 与地图头。

## swf-abc.py

解 CWS zlib，抽出 DoABC/DoABC2，解析 ABC 常量池并反汇编方法。

AVM2 `s32` 是 u30 位型再按 32 位有符号解释，**不是** protobuf zigzag。
误用 zigzag 会把 `MapDataVo.CORRECT_VALUE = 10000000` 读成 `5000000`。

```bash
python3 tools/swf-abc.py /tmp/mccq-swf/MingGame.swf --list-classes
python3 tools/swf-abc.py /tmp/mccq-swf/MingGame.swf --class TileUitls
python3 tools/swf-abc.py /tmp/mccq-swf/MingGame.swf --class CurrentCityView --method ptToSmallmap
python3 tools/swf-abc.py /tmp/mccq-swf/MingGame.swf --search TILE_SIZE
python3 tools/swf-abc.py --self-test
```

对照过的常量：

| 符号 | 值 |
| --- | --- |
| `GAME_WIDTH` / `GAME_HEIGHT` | 1000 / 545 |
| `cameraOffset` | 40 |
| `TileConstant.TILE_SIZE` | 44 |
| `MapBackGround.MAP_TILE_WIDTH/HEIGHT` | 300 |
| `MapDataVo.CORRECT_VALUE` | 10000000 |

`indexToFlat`：`x = (tx - ty) * 44`，`y = (tx + ty) * 22`（地面）；`getIsoIndexMidVertex` 再 `y += 22`。

## parse-mcm.py

按 `MapEncode.encodeByteArray` 解 zlib + 大端 int。京城 `13100.mcm`：

- `tileRow=175` `tileCol=172`
- `nElem=51` `nTrans=48`（不是 originX）
- `offsetX=3520` `offsetY=-1232`
- 有效像素 `7515×4640`

```bash
python3 tools/parse-mcm.py /tmp/har-data/13100.mcm
python3 tools/parse-mcm.py /tmp/har-data/13100.mcm --json
python3 tools/parse-mcm.py --self-test
```

史可法格子 `[115,36]` 的等距像素约 `(6996, 2112)`，落在切片 `7_23` 一带。
