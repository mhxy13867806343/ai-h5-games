# 🎮 traeWork-game

1:1 复刻自 4399 / 瑾龙游戏 / 在线玩 等站点的 H5 网页小游戏合集，纯前端，可直接在浏览器中玩。

| # | 游戏 | 原网站 | 本地入口 | 技术栈 |
|---|------|------|------|------|
| 1 | 螺旋泡泡柱 2 | 4399 [256739_4](https://www.4399.com/flash/256739_4.htm) | [spiral-bubble-2/index.html](spiral-bubble-2/index.html) | Canvas 2D + 六边形网格 + 3D 透视 |
| 2 | 斗地主经典版 | 4399 [207556_3](https://www.4399.com/flash/207556_3.htm) | [doudizhu/index.html](doudizhu/index.html) | Canvas 2D + 牌型解析 + AI 出牌 |
| 3 | 忍者拆炸弹 | 4399 [258699](https://www.4399.com/flash/258699.htm) | [ninja-bomb/index.html](ninja-bomb/index.html) | Godot 4 Web (官方 HTML5 导出) |
| 4 | 开心农场 | 4399 [263724_1](https://www.4399.com/flash/263724_1.htm) | [happy-farm.html](happy-farm.html) | Canvas 2D + 模拟经营 + 订单系统 |
| 5 | 合金弹头 2 | — | [metal-slug-2.html](metal-slug-2.html) | Canvas 2D + 横版射击 + 武器系统 |
| 6 | 真侍魂：武士道列传 | 瑾龙 [18755](https://www.jlgames.cn/game/18755.html) | [samurai-shodown.html](samurai-shodown.html) | NES / EmulatorJS 模拟器 |
| 7 | 三国志：曹操传 | 在线玩 [847](https://zaixianwan.app/games/847) | [cao-cao-chuan.html](cao-cao-chuan.html) | NES / EmulatorJS 模拟器 |
| 8 | 斗地主 | — | [dou-di-zhu.html](dou-di-zhu.html) | Canvas 2D + 牌型解析 |

> 全部为本地复刻版本，仅供学习交流使用。

## 🚀 在线试玩

部署到 GitHub Pages 后访问 `https://<user>.github.io/<repo>/` 查看合集入口，点击卡片进入对应游戏。

## 🛠️ 本地运行

部分游戏（Godot 4 导出的忍者拆炸弹）需要 `SharedArrayBuffer`，因此必须带 `COOP` / `COEP` 响应头，不能直接 `file://` 打开，也不能用普通 `python3 -m http.server`。

推荐使用根目录的 `server.py`（统一为所有游戏提供 COOP/COEP 头）：

```bash
python3 server.py            # 默认端口 8000
python3 server.py 9000       # 自定义端口
# 然后访问 http://localhost:8000/
```

`ninja-bomb/server.py` 仍然保留，可单独启动：

```bash
cd ninja-bomb
python3 server.py            # 默认端口 8772
```

## 📂 目录结构

```
.
├── README.md
├── index.html                # 合集入口
├── server.py                 # 根目录 COOP/COEP 静态服务器
├── spiral-bubble-2/          # 螺旋泡泡柱 2
├── doudizhu/                 # 斗地主经典版
├── dou-di-zhu/               # 斗地主（Canvas 重制）
├── ninja-bomb/               # 忍者拆炸弹 (Godot 4)
│   └── server.py             # COOP/COEP 头本地服务器
├── happy-farm/               # 开心农场
├── metal-slug-2/             # 合金弹头 2
├── samurai-shodown/          # 真侍魂：武士道列传 (NES)
├── cao-cao-chuan/            # 三国志：曹操传 (NES)
└── hy3-game/                 # 早期版本：3 款游戏的轻量复刻
```

## 📝 License

MIT
