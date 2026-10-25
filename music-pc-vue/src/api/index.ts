/**
 * 网易云音乐 API 层（免登录接口）
 * 多源回退：主源失败（限流/404/HTML 错误页）自动尝试下一个源。
 * 自建实例：部署 NeteaseCloudMusicApi 后，把地址加进 API_BASES 首位即可。
 */
export const API_BASES = [
  'https://www.musicapi.cn',   // 公共实例（CORS 开放）
  // 'http://localhost:3300',  // 本地自建实例（开发用）
];

export interface Artist { id: number; name: string; picUrl?: string; img1v1Url?: string; alias?: string[] }
export interface Song {
  id: number; name: string;
  ar?: { name: string }[]; artists?: { name: string }[];
  al?: { name: string; picUrl: string }; album?: { name: string; picUrl?: string };
  dt?: number; duration?: number;
}
export interface Playlist { id: number; name: string; coverImgUrl?: string; picUrl?: string; playCount?: number; trackCount?: number; updateFrequency?: string; description?: string }

const cache = new Map<string, any>();

async function fetchJson(base: string, path: string, qs: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${base}/${path}${qs ? '?' + qs : ''}`, { signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok || text.startsWith('<')) throw new Error(`bad response ${res.status}`);
    return JSON.parse(text);
  } finally { clearTimeout(timer); }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function get<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const q = qs.toString();
  const cacheKey = path + (q ? '?' + q : '');
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let lastErr: unknown = null;
  for (const base of API_BASES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await fetchJson(base, path, q);
        cache.set(cacheKey, data);
        return data;
      } catch (e) { lastErr = e; if (attempt === 0) await sleep(400); }
    }
  }
  const snap = snapshotFor(path, params);
  if (snap) return snap;
  throw lastErr ?? new Error('all sources failed');
}


/* 第三级回退：离线快照（限流/断网时保证预览可用） */
import { SNAPSHOT } from './snapshot';

function snapshotFor(path: string, params: Record<string, string | number>): any | null {
  if (path === 'banner') return SNAPSHOT.banner;
  if (path === 'top/playlist') return SNAPSHOT.topPlaylist;
  if (path === 'toplist') return SNAPSHOT.toplist;
  if (path === 'top/song') return SNAPSHOT.newSongs;
  if (path === 'search/hot') return SNAPSHOT.searchHot;
  if (path === 'search' && params.keywords === '周杰伦') return SNAPSHOT['search_周杰伦'];
  if (path === 'lyric' && params.id === 1901371645) return SNAPSHOT.lyric_1901371645;
  if (path === 'song/url/v1' && params.id === 1901371645) return SNAPSHOT.songUrl_1901371645;
  if (path === 'artist/songs' && params.id === 6452) return SNAPSHOT.artistSongs_6452;
  if (path === 'playlist/track/all') return SNAPSHOT['playlistTracks_' + params.id] || null;
  if (path === 'playlist/detail') return SNAPSHOT['playlistDetail_' + params.id] || null;
  return null;
}

export const api = {
  banner: () => get<{ banners: { pic: string; url?: string }[] }>('banner'),
  topPlaylist: (limit = 12) => get<{ playlists: Playlist[] }>('top/playlist', { limit, order: 'hot' }),
  toplist: () => get<{ list: Playlist[] }>('toplist'),
  playlistDetail: (id: number) => get<{ playlist: Playlist & { tracks?: Song[] } }>('playlist/detail', { id }),
  /** 曲目列表：优先 /playlist/track/all，失败回退 /playlist/detail 内嵌 tracks */
  async playlistTracks(id: number, limit = 60): Promise<{ songs: Song[] }> {
    try {
      return await get<{ songs: Song[] }>('playlist/track/all', { id, limit });
    } catch {
      const d = await get<{ playlist: { tracks?: Song[] } }>('playlist/detail', { id });
      return { songs: (d.playlist.tracks || []).slice(0, limit) };
    }
  },
  topArtists: (limit = 30) => get<{ artists: Artist[] }>('top/artists', { limit }),
  artistDetail: (id: number) => get<any>('artist/detail', { id }),
  artistSongs: (id: number, limit = 30) => get<{ songs: Song[] }>('artist/songs', { id, limit }),
  newSongs: () => get<{ data: Song[] }>('top/song', { type: 7 }),
  searchHot: () => get<{ result: { hots: { first: string }[] } }>('search/hot'),
  search: (keywords: string) => get<{ result: { songs?: Song[]; playlists?: Playlist[] } }>('search', { keywords }),
  songDetail: (ids: number) => get<{ songs: Song[] }>('song/detail', { ids }),
  lyric: (id: number) => get<{ lrc: { lyric: string }; pureMusic?: boolean }>('lyric', { id }),
  songUrl: (id: number) => get<{ data: { url: string | null }[] }>('song/url/v1', { id, level: 'standard' }),
};


/* ============================================================
   扩展接口（免登录可用，2026-10-25 实测 musicapi.cn 全部 200）
   不可用已剔除：mv/toplist、homepage、comment/playlist、check/music、mv/url（风控）
   ============================================================ */
export const api2 = {
  /** 歌单分类列表 */
  catlist: () => get('playlist/catlist'),
  /** 热门歌单分类 */
  playlistHot: () => get('playlist/hot'),
  /** 精品歌单 */
  highquality: (cat: string, limit = 12) => get('top/playlist/highquality', { cat, limit }),
  /** 歌手分类列表 */
  artistList: (type: number, limit = 30) => get('artist/list', { type, limit }),
  /** 歌手热门 50 首歌曲 */
  artistTopSong: (id: number) => get('artist/top/song', { id }),
  /** 歌手专辑 */
  artistAlbum: (id: number, limit = 20) => get('artist/album', { id, limit }),
  /** 歌手描述 */
  artistDesc: (id: number) => get('artist/desc', { id }),
  /** 歌手详情 */
  artistDetail: (id: number) => get('artist/detail', { id }),
  /** 歌手 MV */
  artistMv: (id: number) => get('artist/mv', { id }),
  /** 最新 MV */
  mvFirst: (limit = 30) => get('mv/first', { limit }),
  /** 全部 MV（top/mv） */
  topMv: (limit = 30) => get('top/mv', { limit }),
  /** 推荐 MV */
  personalizedMv: (limit = 12) => get('personalized/mv', { limit }),
  /** 推荐歌单 */
  personalized: (limit = 12) => get('personalized', { limit }),
  /** 推荐新音乐 */
  personalizedNewsong: (limit = 12) => get('personalized/newsong', { limit }),
  /** 推荐电台 */
  djRecommend: () => get('dj/recommend'),
  /** 推荐节目 */
  personalizedDjprogram: () => get('personalized/djprogram'),
  /** 独家放送 */
  privateContent: () => get('personalized/privatecontent'),
  /** 默认搜索关键词（猜你想搜） */
  searchDefault: () => get('search/default'),
  /** 热搜列表（详细，含 score/icon） */
  searchHotDetail: () => get('search/hot/detail'),
  /** 搜索建议 */
  searchSuggest: (keywords: string) => get('search/suggest', { keywords }),
  /** 逐字歌词（含普通 lrc，优先使用） */
  lyricNew: (id: number) => get('lyric/new', { id }),
  /** 歌曲评论（含热门评论 hotComments） */
  commentMusic: (id: number, limit = 20) => get('comment/music', { id, limit }),
  /** 楼层/热门评论 */
  commentHot: (id: number, type = 0) => get('comment/hot', { id, type }),
  /** 首页-发现-圆形图标入口列表 */
  dragonBall: () => get('homepage/dragon/ball'),
};

/** MV 官方外链（mv/url 接口被风控，点击跳转官方页） */
export const mvWebUrl = (id: number) => `https://music.163.com/mv?id=${id}`;

/** 统一歌曲字段 */
export const songArtists = (s: Song) => (s.ar || s.artists || s.album?.artists || []).map(a => a.name).join('/');
export const songCover = (s: Song) => s.al?.picUrl || s.album?.picUrl || '';
export const songDuration = (s: Song) => s.dt || s.duration || 0;
