# 云音乐 · Vue PC 端

网易云音乐桌面 Web 复刻，**Vue 生态**：Vue 3 + Vite + TS + Pinia + Vue Router + **Element Plus**(dark) + UnoCSS + dayjs。只用免登录接口。

## 在线预览
https://mhxy13867806343.github.io/ai-h5-games/music-pc-vue/

## 页面
- 发现音乐：轮播（el-carousel）、热门歌单卡片、新歌速递 el-table（点行即播）
- 排行榜 / 搜索（el-input + el-tag 热搜）/ 歌单详情（el-table）
- 底部常驻播放条：旋转封面、el-slider 拖拽、上下首、播放暂停、暂无版权 Tag

## 数据
`src/api/index.ts` 多源回退。播放状态 Pinia store。

## 运行
```bash
npm install && npm run dev   # http://localhost:5184
```
