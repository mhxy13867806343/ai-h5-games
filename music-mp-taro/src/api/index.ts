import Taro from '@tarojs/taro';
import { API_BASE } from '../config';
import snapshot from '../../music-shared/snapshot.json';

export interface Song { id: number; name: string; dt?: number; duration?: number; ar?: { name: string }[]; artists?: { name: string }[]; al?: { name: string; picUrl: string }; album?: { name: string; picUrl?: string } }
export interface Playlist { id: number; name: string; coverImgUrl?: string; playCount?: number; trackCount?: number; updateFrequency?: string; description?: string }

/** 请求 → 快照兜底 */
function fetchOrSnapshot<T>(path: string, params: Record<string, string | number>, snapKey?: string): Promise<T> {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return new Promise(resolve => {
    Taro.request({
      url: `${API_BASE}/${path}${qs ? '?' + qs : ''}`,
      timeout: 12000,
      success: res => {
        const d = res.data as any;
        if (res.statusCode === 200 && d && typeof d === 'object') resolve(d as T);
        else resolve(((snapshot as any)[snapKey || ''] ?? null) as T);
      },
      fail: () => resolve(((snapshot as any)[snapKey || ''] ?? null) as T),
    });
  });
}

export const api = {
  banner: () => fetchOrSnapshot<{ banners: { pic: string }[] }>('banner', {}, 'banner'),
  topPlaylist: (limit = 12) => fetchOrSnapshot<{ playlists: Playlist[] }>('top/playlist', { limit, order: 'hot' }, 'topPlaylist'),
  toplist: () => fetchOrSnapshot<{ list: Playlist[] }>('toplist', {}, 'toplist'),
  playlistDetail: (id: number) => fetchOrSnapshot<{ playlist: Playlist }>('playlist/detail', { id }, `playlistDetail_${id}`),
  playlistTracks: (id: number, limit = 30) => fetchOrSnapshot<{ songs: Song[] }>('playlist/track/all', { id, limit }, `playlistTracks_${id}`),
  topArtists: (limit = 15) => fetchOrSnapshot<{ artists: { id: number; name: string; picUrl?: string }[] }>('top/artists', { limit }, 'topArtists'),
  newSongs: () => fetchOrSnapshot<{ data: Song[] }>('top/song', { type: 7 }, 'newSongs'),
  searchHot: () => fetchOrSnapshot<{ result: { hots: { first: string }[] } }>('search/hot', {}, 'searchHot'),
  search: (keywords: string) => fetchOrSnapshot<{ result: { songs?: Song[] } }>('search', { keywords }, keywords === '周杰伦' ? 'search_周杰伦' : undefined),
  songUrl: (id: number) => fetchOrSnapshot<{ data: { url: string | null }[] }>('song/url/v1', { id, level: 'standard' }, `songUrl_${id}`),
  lyric: (id: number) => fetchOrSnapshot<{ lrc?: { lyric: string } }>('lyric', { id }, `lyric_${id}`),
};

export const songArtists = (s: Song) => (s.ar || s.artists || s.album?.artists || []).map(a => a.name).join('/');
export const songCover = (s: Song) => s.al?.picUrl || s.album?.picUrl || '';
export const songDuration = (s: Song) => s.dt || s.duration || 0;
