# 云音乐 · React PC 端

网易云音乐桌面 Web 复刻，**React 生态**：React 18 + Vite + TS + **Ant Design 5**(dark) + 自定义 Hooks + UnoCSS + dayjs。只用免登录接口。

## 在线预览
https://mhxy13867806343.github.io/ai-h5-games/music-pc-react/

## 页面
- 发现音乐：轮播（antd Carousel）、热门歌单卡片网格、新歌速递 Table（点行即播）
- 排行榜 / 搜索（热搜 Tag + Table）/ 歌单详情
- 底部常驻播放条：旋转封面、Slider 拖拽、上下首、播放暂停、暂无版权提示

## 数据
`src/api/index.ts` 多源回退（musicapi.cn → 重试 → 快照）。播放状态 `usePlayer()` Hook。

## 运行
```bash
npm install && npm run dev   # http://localhost:5185
```
