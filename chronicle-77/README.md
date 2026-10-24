# 七十七年 · 中华人民共和国大事年表（1949—2026）

从历史坐标读懂七十七年：按年代、年份与主题探索 1949—2026 年间的 104 条重要历史事件精选，每项附原始或权威来源链接。

- 纯原生 HTML + CSS + JavaScript（ES Module），无任何框架
- 关键词搜索、年份筛选、6 大主题分类、年代侧栏索引、正/倒序排序
- 筛选状态同步到 URL 参数，可分享/收藏特定视图
- 数据在 `events.json`（104 项），逻辑在 `core.mjs` / `app.mjs`

源自 ChatGPT 分享页 [chronicle-77-1949](https://chronicle-77-1949.beltrandoherty7681.chatgpt.site/) 的本地开源复刻版。

## 本地运行

需要通过 HTTP 服务器访问（页面会 fetch 本地 JSON）：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/chronicle-77/
```

## 文件结构

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构 |
| `styles.css` | 全部样式 |
| `app.mjs` | 交互逻辑（筛选、渲染、URL 状态） |
| `core.mjs` | 纯函数（过滤、计数、转义） |
| `events.json` | 事件数据（104 项，含来源链接） |
