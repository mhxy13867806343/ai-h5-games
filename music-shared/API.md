# 网易云音乐 API 契约（免登录接口）

所有项目共用。运行时优先请求 API（`API_BASE`，可配置），失败则回退到内置快照
`music-shared/snapshot.json`（import 使用，勿 fetch）。

| 页面 | 接口 | 关键字段 |
| --- | --- | --- |
| 轮播图 | GET /banner | banners[]{pic,url,title} |
| 热门歌单 | GET /top/playlist?limit=12&order=hot | playlists[]{id,name,coverImgUrl,playCount} |
| 排行榜 | GET /toplist | list[]{id,name,coverImgUrl,updateFrequency} |
| 排行榜详情 | GET /playlist/detail?id= | playlist{name,coverImgUrl,description,trackCount} |
| 歌单全部歌曲 | GET /playlist/track/all?id=&limit=50 | songs[]{id,name,ar[{name}],al{name,picUrl},dt} |
| 热门歌手 | GET /top/artists?limit=30 | artists[]{id,name,picUrl,img1v1Url,alias} |
| 歌手热门歌曲 | GET /artist/songs?id=&limit=30 | songs[] |
| 歌手详情 | GET /artist/detail?id= | data.artist{cover,briefDesc} |
| 新歌速递 | GET /top/song?type=7(华语) | data[]{id,name,artists,album,alias} |
| 搜索热词 | GET /search/hot | result.hots[]{first} |
| 搜索 | GET /search?keywords= | result{songs[{id,name,artists,alias}],playlists,artists} |
| 歌曲详情 | GET /song/detail?ids= | songs[]{id,name,ar,al,dt} |
| 歌词 | GET /lyric?id= | lrc.lyric（[mm:ss.xx]文本 时间轴） |
| 播放地址 | GET /song/url/v1?id=&level=standard | data[0].url（可能为空，为空时 UI 显示暂无版权不可播） |

dt 为毫秒时长，展示用 dayjs 或 ms 格式化 mm:ss。
