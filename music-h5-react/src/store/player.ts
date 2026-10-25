/** 轻量全局播放器（模块级单例 + 订阅） */
export interface PlaySong { id: number; name: string; artist: string; cover: string; duration: number }
export interface LyricLine { time: number; text: string }

type Listener = () => void;

const restoredQueue = (() => {
  try { return JSON.parse(localStorage.getItem('react_music_queue') || '{}'); } catch { return { list: [], current: null }; }
})();
const _httpsFix = (arr: any[]) => (arr || []).map(x => ({ ...x, cover: (x.cover || '').replace(/^http:\/\//, 'https://') }));
restoredQueue.list = _httpsFix(restoredQueue.list);
if (restoredQueue.current) restoredQueue.current = { ...restoredQueue.current, cover: (restoredQueue.current.cover || '').replace(/^http:\/\//, 'https://') };

class PlayerCore {
  current: PlaySong | null = (restoredQueue.current || null);
  list: PlaySong[] = (restoredQueue.list || []);
  playing = false;
  currentTime = 0;
  duration = 0;
  lyrics: LyricLine[] = [];
  url = '';
  loadingUrl = false;
  unavailable = false;
  audio: HTMLAudioElement | null = null;
  skipCount = 0;
  savedLists: { name: string; songs: PlaySong[] }[] = (() => {
    try { return JSON.parse(localStorage.getItem('react_saved_lists') || '[]'); } catch { return []; }
  })();
  version = 0;
  listeners = new Set<Listener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  emit() { this.version++; this.listeners.forEach(f => f()); }

  ensureAudio() {
    if (!this.audio) {
      const a = new Audio();
      a.addEventListener('timeupdate', () => { this.currentTime = a.currentTime; this.emit(); });
      a.addEventListener('durationchange', () => { this.duration = a.duration || 0; this.emit(); });
      a.addEventListener('ended', () => { this.next(); });
      a.addEventListener('play', () => { this.playing = true; this.emit(); });
      a.addEventListener('pause', () => { this.playing = false; this.emit(); });
      this.audio = a;
    }
    return this.audio;
  }

  async playList(songs: PlaySong[], index = 0) {
    this.list = songs;
    this.skipCount = 0;
    await this.playIndex(index);
  }

  async playSong(song: PlaySong) { await this.playList([song], 0); }

  async playIndex(i: number) {
    const n = this.list.length;
    if (!n) return;
    const idx = ((i % n) + n) % n;
    const song = this.list[idx];
    this.current = song;
    this.currentTime = 0;
    this.unavailable = false;
    this.loadingUrl = true;
    this.emit();
    const [{ api }, urlRes, lrcRes] = await Promise.all([
      import('../api'),
      import('../api').then(m => m.api.songUrl(song.id)).catch(() => null),
      import('../api').then(m => m.api.lyric(song.id)).catch(() => null),
    ]);
    void api;
    if (this.current?.id !== song.id) return;
    this.persist();
    this.url = urlRes?.data?.[0]?.url || '';
    this.unavailable = !this.url;
    this.lyrics = lrcRes?.lrc?.lyric ? parseLrc(lrcRes.lrc.lyric) : [];
    this.loadingUrl = false;
    const a = this.ensureAudio();
    if (this.url) {
      this.skipCount = 0;
      a.src = this.url;
      a.play().catch(() => {
        this.unavailable = true;
        import('antd-mobile').then(({ Toast }) => Toast.show({ content: '播放被浏览器拦截，请再点一次' }));
      });
    } else {
      // 无版权（VIP/灰色歌曲）：提示并自动切下一首可播放的
      a.pause();
      this.skipCount += 1;
      if (this.skipCount < this.list.length) {
        import('antd-mobile').then(({ Toast }) => Toast.show({ content: `《${song.name}》暂无版权，自动切下一首` }));
        this.next();
      } else {
        this.skipCount = 0;
        import('antd-mobile').then(({ Toast }) => Toast.show({ content: '这个列表的歌都没版权 😢 换个歌单试试' }));
      }
    }
    this.emit();
  }

  toggle() {
    const a = this.ensureAudio();
    if (!this.url) {
      if (this.current) {
        const i = this.list.findIndex(x => x.id === this.current?.id);
        this.playIndex(i === -1 ? 0 : i); // 恢复队列后重新取播放地址
      }
      return;
    }
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }
  next() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i + 1) % this.list.length); } }
  prev() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i - 1 + this.list.length) % this.list.length); } }
  seek(t: number) { const a = this.ensureAudio(); if (this.url) a.currentTime = t; }
  persist() {
    try { localStorage.setItem('react_music_queue', JSON.stringify({ list: this.list, current: this.current })); } catch { /* ignore */ }
  }
  saveQueueAs(name: string) {
    if (!this.list.length || !name.trim()) return;
    this.savedLists = [{ name: name.trim(), songs: [...this.list] }, ...this.savedLists].slice(0, 20);
    localStorage.setItem('react_saved_lists', JSON.stringify(this.savedLists));

    this.emit();
  }
  loadSavedList(name: string) {
    const l = this.savedLists.find(x => x.name === name);
    if (l) this.playList(l.songs.map(x => ({ ...x })), 0);
  }
  removeSavedList(name: string) {
    this.savedLists = this.savedLists.filter(x => x.name !== name);
    localStorage.setItem('react_saved_lists', JSON.stringify(this.savedLists));
    this.emit();
  }
  /** 批量添加到播放列表（不打断当前播放，按 id 去重） */
  addList(songs: PlaySong[]) {
    const exist = new Set(this.list.map(s => s.id));
    const add = songs.filter(s => !exist.has(s.id));
    if (!add.length) {
      import('antd-mobile').then(({ Toast }) => Toast.show({ content: '这些歌都已经在播放列表里啦' }));
      this.emit();
      return;
    }
    this.list = [...this.list, ...add];
    import('antd-mobile').then(({ Toast }) => Toast.show({ content: `已添加 ${add.length} 首到播放列表` }));
    this.emit();
  }
  /** 跳转到指定时间并继续播放（点歌词用） */
  seekPlay(t: number) {
    this.seek(t);
    const a = this.ensureAudio();
    if (this.url && a.paused) a.play();
  }
}

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) out.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out.sort((a, b) => a.time - b.time);
}

export const playerCore = new PlayerCore();
