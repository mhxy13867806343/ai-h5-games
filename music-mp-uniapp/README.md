# 云音乐（music-mp-uniapp）

网易云音乐 App 的微信小程序复刻，基于 **uniapp + Vue 3 + TypeScript（`<script setup lang="ts">`）**，只使用**免登录接口**；接口不可用时自动回退到内置快照离线演示。

深色网易云风 UI：`#1c1c1e` 底色、`#ff3a3a` 主色、`rpx` 单位、uni-ui（uni-icons / uni-load-more）+ 自写样式。

## 目录结构

```
music-mp-uniapp/
├── index.html                    # H5 入口模板（mp-weixin 不用，保留给 vite）
├── package.json
├── tsconfig.json                 # 已开 resolveJsonModule
├── vite.config.ts                # @dcloudio/vite-plugin-uni
├── music-shared/
│   └── snapshot.json             # 离线快照（与接口响应同构，按 key 回退）
└── src/
    ├── main.ts                   # createSSRApp 入口
    ├── App.vue                   # 全局样式（page 深色底）
    ├── pages.json                # 页面路由 + tabBar（首页/排行榜/搜索，纯文字无图标文件）+ uni-ui easycom
    ├── manifest.json             # appid 为空，urlCheck 关闭
    ├── uni.scss                  # 深色主题 SCSS 变量与 ellipsis 混入
    ├── config.ts                 # API_BASE（默认空 = 纯快照模式）
    ├── shims-vue.d.ts
    ├── api/
    │   └── index.ts              # uni.request 封装 + fetchOrSnapshot 快照回退 + 免登录接口
    ├── stores/
    │   └── player.ts             # usePlayer() 播放器单例（模块级，跨页面共享）
    ├── utils/
    │   ├── format.ts             # dayjs 时长/播放数格式化
    │   └── lyric.ts              # [mm:ss.xx] LRC 解析
    ├── types/
    │   └── music.ts              # Song/Playlist/Artist/LyricLine 等类型
    └── pages/
        ├── index/index.vue       # 首页：轮播 / 热门歌单 / 热门歌手 / 新歌速递
        ├── rank/rank.vue         # 排行榜：toplist 卡片
        ├── search/search.vue     # 搜索：热词 / 历史(storage) / 单曲+歌手 Tab
        ├── playlist/playlist.vue # 歌单详情：封面/简介/曲目列表，点歌播放
        └── player/player.vue     # 播放器：旋转封面 / 可拖进度条 / 歌词滚动高亮
```

## 页面路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `pages/index/index` | 首页（tabBar） | banner 轮播、topPlaylist 横滑网格（封面/播放数）、topArtists 热门歌手、newSongs 新歌速递（歌名/歌手/时长） |
| `pages/rank/rank` | 排行榜（tabBar） | toplist 卡片（封面/名称/updateFrequency），点击进入歌单详情 |
| `pages/search/search` | 搜索（tabBar） | searchHot 热词点击即搜、输入搜索、历史记录 storage；结果分单曲/歌手，歌手可下钻热门歌曲 |
| `pages/playlist/playlist?id=` | 歌单详情 | 封面/名称/description/曲目列表（序号/歌名/歌手/时长），点歌即播、支持播放全部 |
| `pages/player/player?id=` | 播放器 | 旋转唱片封面、可拖动进度条、上一首/播放暂停/下一首、歌词 scroll-into-view 高亮滚动 |

## 运行

```bash
npm install
npm run dev:mp-weixin
```

然后用微信开发者工具「导入项目」，目录选 `dist/dev/mp-weixin`，并在
「详情 → 本地设置」勾选**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**。
（`src/manifest.json` 里 `mp-weixin.setting.urlCheck` 已置 `false`，开发者工具仍建议手动确认勾选。）

发布构建：`npm run build:mp-weixin`（产物在 `dist/build/mp-weixin`）。

## API 配置与快照回退

- 所有请求走 `src/api/index.ts` 的 `fetchOrSnapshot(path, params, snapshotKey)`：
  1. 先请求 `GET ${API_BASE}${path}`；
  2. 失败（含 `API_BASE` 为空、超时、非 200）则回退 `import snapshot from '../../music-shared/snapshot.json'` 的同名 key；
  3. 快照也没有该 key 时返回 `null`，页面渲染空态，不会崩溃。
- `API_BASE` 常量在 `src/config.ts`，默认空字符串（离线快照模式）。
  要接真实数据：自建 [NeteaseCloudMusicApi](https://neteasecloudmusicapi.vercel.app) 服务，然后改：
  ```ts
  export const API_BASE = 'http://192.168.1.100:3000'
  ```
- 免登录接口契约见 `../music-shared/API.md`（banner / top/playlist / toplist / playlist/detail / playlist/track/all / top/artists / artist/songs / top/song / search/hot / search / song/detail / lyric / song/url/v1）。
- 快照内置 key：`banner, topPlaylist, toplist, playlistDetail_3778678, playlistTracks_3778678, topArtists, artistSongs_6452, newSongs, searchHot, search_周杰伦, lyric_1901371645, songUrl_1901371645`。
  即离线时：榜单/歌单只有 **云音乐热歌榜（3778678）** 可进，歌手热门歌曲只有 **周杰伦（6452）**，搜索试「**周杰伦**」，可完整试听播放的是 **id 1901371645**（外链播放地址受版权影响，不可播时 UI 提示「暂无版权」）。
- 快照中的封面/头像为 picsum.photos 占位图，歌词为演示用原创占位文本；均需「不校验合法域名」才能显示。

## 播放器说明

`src/stores/player.ts` 导出 `usePlayer()`（模块级单例）：所有页面共享同一份
reactive 状态和同一个 `uni.createInnerAudioContext`。列表页 `player.play(song, queue)`
点歌（queue 为播放队列），播放器页控制播放/暂停/上下首/进度/歌词；
歌词由 `utils/lyric.ts` 解析 `[mm:ss.xx]` 时间轴，播放中按当前时间高亮并用
`scroll-into-view` 滚动到当前行；播完自动下一首（队列循环）。

## 技术要点

- uniapp + Vue 3 组合式 API + TypeScript，页面均为 `<script setup lang="ts">`
- 时间处理统一 dayjs（`utils/format.ts`，用 utc 插件格式化时长，避免时区偏移）
- UI：uni-ui（easycom 自动引入）+ 自写样式，深色网易云风格，rpx 单位
- 快照导入依赖 tsconfig 的 `resolveJsonModule`；对快照缺失一律防御（空态兜底）
