/** 轻量全局播放器（模块级单例 + 订阅） */
export interface PlaySong { id: number; name: string; artist: string; cover: string; duration: number }
export interface LyricLine { time: number; text: string }

type Listener = () => void;

class PlayerCore {
  current: PlaySong | null = null;
  list: PlaySong[] = [];
  playing = false;
  currentTime = 0;
  duration = 0;
  lyrics: LyricLine[] = [];
  url = '';
  loadingUrl = false;
  unavailable = false;
  audio: HTMLAudioElement | null = null;
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
    this.url = urlRes?.data?.[0]?.url || '';
    this.unavailable = !this.url;
    this.lyrics = lrcRes?.lrc?.lyric ? parseLrc(lrcRes.lrc.lyric) : [];
    this.loadingUrl = false;
    const a = this.ensureAudio();
    if (this.url) { a.src = this.url; a.play().catch(() => {}); }
    else a.pause();
    this.emit();
  }

  toggle() {
    const a = this.ensureAudio();
    if (!this.url) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }
  next() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i + 1) % this.list.length); } }
  prev() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i - 1 + this.list.length) % this.list.length); } }
  seek(t: number) { const a = this.ensureAudio(); if (this.url) a.currentTime = t; }
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
