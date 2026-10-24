# Pelican Coast · 鹈鹕骑行

一只戴绿色头盔的白鹈鹕骑着自行车沿海岸慢行：双脚与踏板同步转动的 Canvas 交互动画，内置运动模型自检。

- 纯原生 HTML + CSS + JavaScript（ES Module + Canvas 2D），无任何框架
- 运动学模型：踏板、膝踝关节、车轮滚动一一对应（`model.js`）
- 支持暂停/继续（按钮或空格键）、0.5×–2× 倍速、`prefers-reduced-motion` 自动暂停
- "动画自检"面板实时运行 6 项运动模型检查
- 分享按钮使用当前页面地址（Web Share API，降级为复制链接）

源自 ChatGPT 分享页 [pelican-coast-ride](https://pelican-coast-ride.beltrandoherty7681.chatgpt.site) 的本地开源复刻版。

## 本地运行

直接用浏览器打开 `index.html`，或：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/pelican-coast-ride/
```

## 文件结构

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构 |
| `style.css` | 全部样式 |
| `app.js` | 渲染与交互控制 |
| `model.js` | 骑行动作模型（几何 + 运动学 + 自检） |
| `share.js` | 分享逻辑 |
