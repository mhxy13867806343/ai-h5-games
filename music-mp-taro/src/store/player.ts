/** 全局播放器（Taro.createInnerAudioContext + 订阅） */
import Taro from '@tarojs/taro';
import { api } from '../api';

export interface PlaySong { id: number; name: string; artist: string; cover: string; duration: number }
export interface LyricLine { time: number; text: string }
type Listener = () => void;

function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) out.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out.sort((a, b) => a.time - b.time);
}

class PlayerCore {
  current: PlaySong | null = null;
  list: PlaySong[] = (() => { try { return JSON.parse(Taro.getStorageSync('taro_music_queue') || '[]'); } catch { return []; } })();
  playing = false;
  currentTime = 0;
  duration = 0;
  lyrics: LyricLine[] = [];
  url = '';
  unavailable = false;
  loadingUrl = false;
  version = 0;
  audio: Taro.InnerAudioContext | null = null;
  listeners = new Set<Listener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  emit() { this.version++; this.listeners.forEach(f => f()); }

  ensureAudio() {
    if (!this.audio) {
      const a = Taro.createInnerAudioContext();
      a.onTimeUpdate(() => { this.currentTime = a.currentTime; this.duration = a.duration || 0; this.emit(); });
      a.onEnded(() => { this.next(); });
      a.onPlay(() => { this.playing = true; this.emit(); });
      a.onPause(() => { this.playing = false; this.emit(); });
      a.onError(() => { this.unavailable = true; this.playing = false; this.emit(); });
      this.audio = a;
    }
    return this.audio;
  }

  async playList(songs: PlaySong[], index = 0) { this.list = songs; try { Taro.setStorageSync('taro_music_queue', JSON.stringify(this.list)); } catch { /* ignore */ } await this.playIndex(index); }
  addList(songs: PlaySong[]) {
    const exist = new Set(this.list.map(s => s.id));
    const add = songs.filter(s => !exist.has(s.id));
    if (!add.length) { Taro.showToast({ title: '这些歌都已经在播放列表里啦', icon: 'none' }); this.emit(); return; }
    this.list = [...this.list, ...add];
    try { Taro.setStorageSync('taro_music_queue', JSON.stringify(this.list)); } catch { /* ignore */ }
    Taro.showToast({ title: `已添加 ${add.length} 首`, icon: 'none' });
    this.emit();
  }
  /** 批量添加到播放列表（不打断当前播放，按 id 去重） */
  addList(songs: PlaySong[]) {
    const exist = new Set(this.list.map(s => s.id));
    const add = songs.filter(s => !exist.has(s.id));
    if (!add.length) { Taro.showToast({ title: '这些歌都已经在播放列表里啦', icon: 'none' }); this.emit(); return; }
    this.list = [...this.list, ...add];
    Taro.showToast({ title: `已添加 ${add.length} 首`, icon: 'none' });
    this.emit();
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
    const [urlRes, lrcRes] = await Promise.all([
      api.songUrl(song.id), api.lyric(song.id),
    ]);
    if (this.current?.id !== song.id) return;
    this.url = urlRes?.data?.[0]?.url || '';
    this.unavailable = !this.url;
    this.lyrics = lrcRes?.lrc?.lyric ? parseLrc(lrcRes.lrc.lyric) : [];
    this.loadingUrl = false;
    const a = this.ensureAudio();
    if (this.url) { a.src = this.url; a.play(); } else { a.stop(); }
    this.emit();
  }

  toggle() { const a = this.ensureAudio(); if (!this.url) return; if (a.paused) a.play(); else a.pause(); }
  next() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i + 1) % this.list.length); } }
  prev() { if (this.list.length) { const i = this.list.findIndex(s => s.id === this.current?.id); this.playIndex((i - 1 + this.list.length) % this.list.length); } }
  seek(t: number) { const a = this.ensureAudio(); if (this.url) a.seek(t); }
}

export const playerCore = new PlayerCore();
