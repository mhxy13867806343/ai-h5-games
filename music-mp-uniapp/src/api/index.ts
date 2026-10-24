/**
 * 请求层：封装 uni.request + 快照回退。
 *
 * - 正式数据：GET `${API_BASE}${path}`（API_BASE 见 src/config.ts，默认空）
 * - 回退数据：请求失败时取 `../../music-shared/snapshot.json` 中与 snapshotKey 同名的 key
 *   （快照结构与接口响应一致，tsconfig 已开 resolveJsonModule）
 * - 快照也没有对应 key 时返回 null，页面据此渲染空态，绝不抛错崩溃
 *
 * 接口契约：免登录接口见 ../music-shared/API.md。
 */
import { API_BASE, REQUEST_TIMEOUT } from '../config'
import type { Artist, BannerItem, Playlist, SearchResult, Song } from '../types/music'
import snapshot from '../../music-shared/snapshot.json'

type QueryParams = Record<string, string | number | undefined>
type AnyRecord = Record<string, any>

const snap = snapshot as AnyRecord

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const pairs: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/** 低层 GET 请求，失败 reject */
function request<T = AnyRecord>(path: string, params?: QueryParams): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!API_BASE) {
      reject(new Error('API_BASE 未配置，使用离线快照'))
      return
    }
    uni.request({
      url: `${API_BASE}${path}${buildQuery(params)}`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as AnyRecord
          if (body && (body.code === undefined || body.code === 200)) {
            resolve(body as T)
          } else {
            reject(new Error(`接口返回异常 code=${body?.code}`))
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || '网络请求失败')),
    })
  })
}

/**
 * 先请求 API，失败回退快照同名 key；两边都没有时返回 null（调用方渲染空态）。
 */
export async function fetchOrSnapshot<T = AnyRecord>(
  path: string,
  params: QueryParams | undefined,
  snapshotKey: string
): Promise<T | null> {
  try {
    return await request<T>(path, params)
  } catch (e) {
    const fallback = snap[snapshotKey]
    if (fallback === undefined || fallback === null) {
      console.warn(`[music] 请求失败且快照缺失: ${snapshotKey}`, e)
      return null
    }
    return fallback as T
  }
}

/* ---------------- 数据归一化 ---------------- */

function toArr(value: any): any[] {
  return Array.isArray(value) ? value : []
}

/** 把 ar/al/dt（歌单、歌手、歌曲详情）与 artists/album/duration（新歌、搜索）两种结构统一为 Song */
export function normalizeSong(raw: any): Song {
  const artists = toArr(raw?.ar ?? raw?.artists)
  const album = raw?.al ?? raw?.album ?? {}
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? '未知歌曲'),
    artists:
      artists
        .map((a: any) => a?.name)
        .filter((n: any) => !!n)
        .join(' / ') || '未知艺人',
    albumName: String(album?.name ?? ''),
    picUrl: String(album?.picUrl ?? ''),
    duration: Number(raw?.dt ?? raw?.duration ?? 0) || 0,
  }
}

function normalizeArtist(raw: any): Artist {
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? '未知歌手'),
    picUrl: String(raw?.picUrl ?? ''),
    img1v1Url: String(raw?.img1v1Url ?? raw?.picUrl ?? ''),
    alias: toArr(raw?.alias).map((a: any) => String(a)),
  }
}

/* ---------------- 免登录接口封装 ---------------- */

/** 轮播图 GET /banner */
export async function getBanner(): Promise<BannerItem[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/banner', undefined, 'banner')
  return toArr(data?.banners).filter((b: any) => !!b?.pic)
}

/** 热门歌单 GET /top/playlist?limit=&order=hot */
export async function getTopPlaylist(limit = 12): Promise<Playlist[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/top/playlist', { limit, order: 'hot' }, 'topPlaylist')
  return toArr(data?.playlists)
}

/** 排行榜 GET /toplist */
export async function getToplist(): Promise<Playlist[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/toplist', undefined, 'toplist')
  return toArr(data?.list)
}

/** 歌单详情 GET /playlist/detail?id= */
export async function getPlaylistDetail(id: number | string): Promise<Playlist | null> {
  const data = await fetchOrSnapshot<AnyRecord>('/playlist/detail', { id }, `playlistDetail_${id}`)
  const playlist = data?.playlist
  if (!playlist || !playlist.name) return null
  return playlist as Playlist
}

/** 歌单全部歌曲 GET /playlist/track/all?id=&limit= */
export async function getPlaylistTracks(id: number | string, limit = 50): Promise<Song[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/playlist/track/all', { id, limit }, `playlistTracks_${id}`)
  return toArr(data?.songs).map(normalizeSong)
}

/** 热门歌手 GET /top/artists?limit= */
export async function getTopArtists(limit = 30): Promise<Artist[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/top/artists', { limit }, 'topArtists')
  return toArr(data?.artists).map(normalizeArtist)
}

/** 歌手热门歌曲 GET /artist/songs?id=&limit= */
export async function getArtistSongs(id: number | string, limit = 30): Promise<Song[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/artist/songs', { id, limit }, `artistSongs_${id}`)
  return toArr(data?.songs).map(normalizeSong)
}

/** 新歌速递 GET /top/song?type=7（华语） */
export async function getNewSongs(type = 7): Promise<Song[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/top/song', { type }, 'newSongs')
  return toArr(data?.data).map(normalizeSong)
}

/** 搜索热词 GET /search/hot */
export async function getSearchHot(): Promise<string[]> {
  const data = await fetchOrSnapshot<AnyRecord>('/search/hot', undefined, 'searchHot')
  return toArr(data?.result?.hots)
    .map((h: any) => String(h?.first ?? ''))
    .filter(Boolean)
}

/** 搜索 GET /search?keywords= */
export async function search(keywords: string): Promise<SearchResult | null> {
  const data = await fetchOrSnapshot<AnyRecord>('/search', { keywords }, `search_${keywords}`)
  const result = data?.result
  if (!result) return null
  return {
    songs: toArr(result.songs).map(normalizeSong),
    artists: toArr(result.artists).map(normalizeArtist),
  }
}

/** 歌曲详情 GET /song/detail?ids= */
export async function getSongDetail(id: number | string): Promise<Song | null> {
  const data = await fetchOrSnapshot<AnyRecord>('/song/detail', { ids: id }, `songDetail_${id}`)
  const first = toArr(data?.songs)[0]
  return first ? normalizeSong(first) : null
}

/** 歌词 GET /lyric?id=，返回 lrc 原文（可能为空字符串） */
export async function getLyric(id: number | string): Promise<string> {
  const data = await fetchOrSnapshot<AnyRecord>('/lyric', { id }, `lyric_${id}`)
  return String(data?.lrc?.lyric ?? '')
}

/** 播放地址 GET /song/url/v1?id=&level=standard，取 data[0].url（可能为空 = 无版权） */
export async function getSongUrl(id: number | string): Promise<string> {
  const data = await fetchOrSnapshot<AnyRecord>('/song/url/v1', { id, level: 'standard' }, `songUrl_${id}`)
  const url = toArr(data?.data)[0]?.url
  return typeof url === 'string' ? url : ''
}
