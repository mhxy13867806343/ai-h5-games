/**
 * 音乐数据类型定义。
 * 接口契约见 ../music-shared/API.md（免登录接口）。
 */

/** 歌曲的规范视图模型：统一接口两种返回结构（ar/al/dt 与 artists/album/duration） */
export interface Song {
  id: number
  /** 歌名 */
  name: string
  /** 艺人名，多人以 " / " 连接 */
  artists: string
  /** 专辑名 */
  albumName: string
  /** 封面图 */
  picUrl: string
  /** 时长（毫秒） */
  duration: number
}

/** 轮播项（GET /banner -> banners[]） */
export interface BannerItem {
  pic: string
  url?: string
  title?: string
  typeTitle?: string
}

/** 歌单（topPlaylist / toplist / playlistDetail 共用） */
export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
  playCount?: number
  /** 榜单更新频率，如「每日更新」 */
  updateFrequency?: string
  description?: string
  trackCount?: number
}

/** 歌手（topArtists / 搜索结果） */
export interface Artist {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
  alias?: string[]
}

/** 歌词行（已解析为秒） */
export interface LyricLine {
  time: number
  text: string
}

/** 搜索结果 */
export interface SearchResult {
  songs: Song[]
  artists: Artist[]
}
