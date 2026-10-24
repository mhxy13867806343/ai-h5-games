# 云音乐 · React H5 端

网易云音乐 H5 复刻，**React 生态**：React 18 + **自定义 Hooks**（useSyncExternalStore 订阅全局播放器）+ React Router 6 + **Ant Design Mobile 5** + **UnoCSS** + **dayjs** + Vite + TypeScript。只用免登录接口。

## 在线预览

**https://mhxy13867806343.github.io/ai-h5-games/music-h5-react/**（`dist/` 已随仓库构建）

## 运行

```bash
npm install
npm run dev      # http://localhost:5175
npm run build
```

## 数据

同 Vue 端：`src/api/index.ts` 多源回退（musicapi.cn → 重试 → 内置快照）。

## 页面（5 个，antd-mobile TabBar）

| 路由 | 说明 |
| --- | --- |
| / | 轮播（scroll-snap 自动播）+ 热门歌单横滑 + 新歌速递 |
| /rank | 官方榜卡片 |
| /search | 热搜 Tag + 搜索 + 历史记录(localStorage) |
| /playlist/:id | 歌单详情 + 曲目，点歌播放 |
| /player | 旋转封面、Slider 进度、上下首、歌词高亮滚动、NoticeBar 无版权提示 |

播放器核心 `src/store/player.ts` 模块单例 + `usePlayer()` Hook 跨页共享。免登录接口清单见 `../music-shared/API.md`。
