# 云音乐 · Taro 小程序端（React + TS）

网易云音乐微信小程序复刻，**React 生态**：Taro 3 + React 18 + TypeScript + 自定义 Hooks + dayjs，只用免登录接口。

## 运行

```bash
npm install
npm run dev:weapp     # 生成 dist/，微信开发者工具导入项目根目录（appid 用测试号）
```

- 开发者工具「详情 → 本地设置」勾选**不校验合法域名**（或在小程序后台把 API 域名加入 request/downloadFile 合法域名）
- API 源在 `src/config.ts`：默认公共实例 `https://www.musicapi.cn`；自建 [NeteaseCloudMusicApi](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 后替换
- 接口失败自动回退内置快照 `music-shared/snapshot.json`（离线可预览核心页面）

## 页面（5 个，tabBar：首页/排行榜/搜索）

| 路由 | 说明 |
| --- | --- |
| pages/index/index | 轮播 + 热门歌单横滑 + 热门歌手 + 新歌速递（点歌即播） |
| pages/rank/rank | 官方榜卡片 → 歌单详情 |
| pages/search/search | 热词点击即搜 + 输入搜索 + 历史记录(storage) |
| pages/playlist/playlist?id= | 歌单详情：封面/简介/曲目列表，点歌播放 |
| pages/player/player | 旋转唱片、可拖进度、上下首/播放暂停、歌词 scroll-into-view 高亮、无版权提示 |

全局播放状态 `src/store/player.ts`（单一 InnerAudioContext，跨页续播），React 侧经 `usePlayer()` Hook（useSyncExternalStore）订阅。

免登录接口清单见 `../music-shared/API.md`。
