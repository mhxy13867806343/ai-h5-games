# 🎮 traeWork-game

3 个 1:1 复刻自 4399 的 H5 小游戏，纯前端，可直接在浏览器中玩。

| # | 游戏 | 原 4399 链接 | 本地入口 | 技术栈 |
|---|------|------|------|------|
| 1 | 螺旋泡泡柱 2 | https://www.4399.com/flash/256739_4.htm | [spiral-bubble-2/index.html](spiral-bubble-2/index.html) | Canvas 2D + 六边形网格 + 3D 透视 |
| 2 | 斗地主经典版 | https://www.4399.com/flash/207556_3.htm | [doudizhu/index.html](doudizhu/index.html) | Canvas 2D + 牌型解析 + AI 出牌 |
| 3 | 忍者拆炸弹 | https://www.4399.com/flash/258699.htm | [ninja-bomb/index.html](ninja-bomb/index.html) | Godot 4 Web (官方 HTML5 导出) |

> 全部为本地复刻版本，仅供学习交流使用。

## 🚀 在线试玩

部署到 GitHub Pages 后访问：

- 主页：https://&lt;user&gt;.github.io/&lt;repo&gt;/
- 螺旋泡泡柱 2：…/spiral-bubble-2/index.html
- 斗地主：…/doudizhu/index.html
- 忍者拆炸弹：…/ninja-bomb/index.html

## 🛠️ 本地运行

部分游戏（Godot 4 导出的 ninja-bomb）需要 SharedArrayBuffer，因此必须带 `COOP` / `COEP` 响应头，不能直接 `file://` 打开，也不能用普通 `python3 -m http.server`。在仓库根目录起一个支持这两个头的服务器即可：

```bash
# 任意目录下都行
python3 -m http.server 8080
```

如果你嫌麻烦，[ninja-bomb/server.py](ninja-bomb/server.py) 已经写好带 `Cross-Origin-Embedder-Policy: require-corp` 和 `Cross-Origin-Opener-Policy: same-origin` 头的服务器：

```bash
cd ninja-bomb
python3 server.py
# 打开 http://localhost:8772/ninja-bomb.html
```

螺旋泡泡柱 2、斗地主可以直接双击 `index.html` 打开。

## 📂 目录结构

```
.
├── README.md
├── spiral-bubble-2/
│   ├── index.html
│   ├── style.css
│   └── game.js
├── doudizhu/
│   ├── doudizhu.html
│   ├── doudizhu.css
│   └── doudizhu.js
└── ninja-bomb/
    ├── ninja-bomb.html     # 4399 风格包装页
    ├── ninja-bomb.css
    ├── index.html          # Godot 4 加载器
    ├── index.js            # Godot 引擎 JS
    ├── index.wasm          # Godot 引擎二进制
    ├── index.pck           # 游戏资源包
    ├── index.webp          # 启动画面
    ├── pako_inflate.min.js
    ├── playgama-bridge.js
    ├── playgama-bridge-config.json
    └── server.py           # 带 COOP/COEP 头的本地服务器
```

## 📝 License

MIT
