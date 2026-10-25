import { defineStore } from 'pinia';
import { showToast } from 'vant';
import { api } from '../api';

export interface LyricLine { time: number; text: string }

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) out.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out.sort((a, b) => a.time - b.time);
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    current: null as null | { id: number; name: string; artist: string; cover: string; duration: number },
    list: [] as { id: number; name: string; artist: string; cover: string; duration: number }[],
    playing: false,
    currentTime: 0,
    duration: 0,
    lyrics: [] as LyricLine[],
    url: '' as string,
    loadingUrl: false,
    unavailable: false,
    _audio: null as HTMLAudioElement | null,
    skipCount: 0,
  }),
  actions: {
    audio() {
      if (!this._audio) {
        const a = new Audio();
        a.addEventListener('timeupdate', () => { this.currentTime = a.currentTime; });
        a.addEventListener('durationchange', () => { this.duration = a.duration || this.current?.duration || 0; });
        a.addEventListener('ended', () => this.next(true));
        a.addEventListener('play', () => { this.playing = true; });
        a.addEventListener('pause', () => { this.playing = false; });
        this._audio = a;
      }
      return this._audio;
    },
    async playList(songs: { id: number; name: string; artist: string; cover: string; duration: number }[], index = 0) {
      this.list = songs;
      this.skipCount = 0;
      await this.playIndex(index);
    },
    async playIndex(i: number) {
      const n = this.list.length;
      if (!n) return;
      const idx = ((i % n) + n) % n;
      const song = this.list[idx];
      this.current = song;
      this.currentTime = 0;
      this.unavailable = false;
      this.loadingUrl = true;
      // 歌词与播放地址并行
      const [urlRes, lrcRes] = await Promise.all([
        api.songUrl(song.id).catch(() => null),
        api.lyric(song.id).catch(() => null),
      ]);
      if (this.current?.id !== song.id) return; // 已切歌
      this.url = urlRes?.data?.[0]?.url || '';
      this.unavailable = !this.url;
      this.lyrics = lrcRes?.lrc?.lyric ? parseLrc(lrcRes.lrc.lyric) : [];
      this.loadingUrl = false;
      const a = this.audio();
      if (this.url) {
        this.skipCount = 0;
        a.src = this.url;
        a.play().catch(() => { this.unavailable = true; showToast('播放被浏览器拦截，请再点一次'); });
      } else {
        // 无版权（VIP/灰色歌曲）：提示并自动切下一首可播放的
        a.pause();
        this.skipCount += 1;
        if (this.skipCount < this.list.length) {
          showToast(`《${song.name}》暂无版权，自动切下一首`);
          this.next();
        } else {
          this.skipCount = 0;
          showToast('这个列表的歌都没版权 😢 换个歌单试试');
        }
      }
    },
    async playSong(song: { id: number; name: string; artist: string; cover: string; duration: number }) {
      await this.playList([song], 0);
    },
    toggle() {
      const a = this.audio();
      if (!this.url) {
        if (this.current) this.next(); // 无版权：直接切下一首
        return;
      }
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    },
    next(auto = false) {
      if (!this.list.length) return;
      const i = this.list.findIndex(s => s.id === this.current?.id);
      this.playIndex((i + 1) % this.list.length);
      void auto;
    },
    prev() {
      if (!this.list.length) return;
      const i = this.list.findIndex(s => s.id === this.current?.id);
      this.playIndex((i - 1 + this.list.length) % this.list.length);
    },
    seek(t: number) {
      const a = this.audio();
      if (this.url) a.currentTime = t;
    },
    /** 跳转到指定时间并继续播放（点歌词用） */
    seekPlay(t: number) {
      this.seek(t);
      const a = this.audio();
      if (this.url && a.paused) a.play().catch(() => {});
    },
  },
});
