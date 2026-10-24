# 云音乐 · Vue H5 端

网易云音乐 H5 复刻，**Vue 生态**：Vue 3 + `<script setup lang="ts">` + Pinia + Vue Router + **Vant 4** + **UnoCSS** + **dayjs** + Vite + TypeScript。只用免登录接口。

## 在线预览

**https://mhxy13867806343.github.io/ai-h5-games/music-h5-vue/#/**（`dist/` 已随仓库构建）

## 运行

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 产物 dist/
```

## 数据

`src/api/index.ts`：多源回退——公共实例 `https://www.musicapi.cn`（CORS 开放，来自用户推荐）→ 自动重试 → 内置快照 `src/api/snapshot.ts`（限流/断网也能看核心页面）。自建 [NeteaseCloudMusicApi](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 后把地址加进 `API_BASES` 即可。

## 页面（5 个，Vant Tabbar 路由）

| 路由 | 说明 |
| --- | --- |
| / | Vant 轮播（官方 banner）+ 热门歌单横滑 + 新歌速递（dayjs 格式化时长） |
| /rank | 官方榜卡片（更新频率） |
| /search | 热搜标签 + 搜索 + 历史记录(localStorage) |
| /playlist/:id | 歌单详情 + 曲目列表，点歌播放 |
| /player | 旋转唱片、Vant Slider 进度、上下首/播放暂停、歌词滚动高亮、无版权提示 |

全局播放状态 Pinia store（单一 Audio 实例，跨页续播），底部迷你播放条常驻。免登录接口清单见 `../music-shared/API.md`。
