/**
 * 全局播放器 store（composable 模块级单例）。
 *
 * 任何页面 `const player = usePlayer()` 拿到的都是同一份 reactive 状态和
 * 同一个 uni.createInnerAudioContext 实例：列表页点歌、播放器页控制，
 * 状态天然同步。audio context 在第一次播放时才懒创建。
 */
import { computed, reactive } from 'vue'
import { getLyric, getSongUrl } from '../api'
import { parseLyric } from '../utils/lyric'
import type { LyricLine, Song } from '../types/music'

export interface PlayerState {
  /** 播放队列（点歌时所在列表整份传入） */
  queue: Song[]
  /** 当前歌曲 */
  current: Song | null
  /** 是否正在播（audio 播放中） */
  playing: boolean
  /** 当前歌是否有可播放地址（false = 暂无版权） */
  playable: boolean
  /** 是否正在加载 url/歌词 */
  loading: boolean
  /** 播放地址（快照/API 都拿不到时为空字符串） */
  url: string
  /** 当前播放位置（秒） */
  currentTime: number
  /** 总时长（秒，优先 audio.duration，缺省用歌曲元数据） */
  duration: number
  /** 解析后的歌词 */
  lyric: LyricLine[]
  /** 当前高亮歌词行下标，-1 表示未到第一行 */
  lyricIndex: number
}

const state = reactive<PlayerState>({
  queue: (() => { try { return JSON.parse(uni.getStorageSync('music_queue') || '[]'); } catch { return []; } })() as Song[],
  current: null,
  playing: false,
  playable: true,
  loading: false,
  url: '',
  currentTime: 0,
  duration: 0,
  lyric: [],
  lyricIndex: -1,
})

let audio: UniApp.InnerAudioContext | null = null

/** 懒创建全局 InnerAudioContext，只创建一次 */
function ensureAudio(): UniApp.InnerAudioContext {
  if (audio) return audio
  audio = uni.createInnerAudioContext()
  audio.obeyMuteSwitch = false

  audio.onPlay(() => {
    state.playing = true
  })
  audio.onPause(() => {
    state.playing = false
  })
  audio.onStop(() => {
    state.playing = false
  })
  audio.onCanplay(() => {
    if (audio && audio.duration > 0) state.duration = audio.duration
  })
  audio.onTimeUpdate(() => {
    if (!audio) return
    state.currentTime = audio.currentTime
    if (audio.duration > 0) state.duration = audio.duration
    updateLyricIndex()
  })
  audio.onEnded(() => {
    // 自动下一首（队列循环）
    next()
  })
  audio.onError((err) => {
    console.warn('[player] audio error', err?.errMsg)
    state.playing = false
    state.playable = false
  })

  return audio
}

function indexOfCurrent(): number {
  if (!state.current) return -1
  return state.queue.findIndex((s) => s.id === state.current?.id)
}

function updateLyricIndex() {
  const lyric = state.lyric
  if (!lyric.length) {
    state.lyricIndex = -1
    return
  }
  // 小幅提前量让高亮跟手感更好
  const t = state.currentTime + 0.25
  let idx = -1
  for (let i = 0; i < lyric.length; i++) {
    if (lyric[i].time <= t) idx = i
    else break
  }
  if (idx !== state.lyricIndex) state.lyricIndex = idx
}

/** 拉取 url + 歌词并开始播放 */
async function loadSong(song: Song) {
  state.current = song
  state.playing = false
  state.playable = true
  state.loading = true
  state.url = ''
  state.currentTime = 0
  state.duration = song.duration > 0 ? song.duration / 1000 : 0
  state.lyric = []
  state.lyricIndex = -1

  const [url, lrc] = await Promise.all([getSongUrl(song.id), getLyric(song.id)])

  // 等待期间用户可能已切歌
  if (!state.current || state.current.id !== song.id) return

  state.loading = false
  state.lyric = parseLyric(lrc)

  const ctx = ensureAudio()
  if (url) {
    state.url = url
    ctx.src = url
    ctx.play()
  } else {
    // 拿不到播放地址：按「暂无版权」处理，UI 提示且不可播
    state.playable = false
    state.playing = false
  }
}

/** 从头播放当前歌 */
function replay() {
  if (!state.current) return
  if (!state.playable || !state.url) {
    uni.showToast({ title: '暂无版权，无法播放', icon: 'none' })
    return
  }
  const ctx = ensureAudio()
  ctx.seek(0)
  state.currentTime = 0
  ctx.play()
}

/**
 * 播放一首歌；可选传入所在列表作为播放队列。
 * 点到当前正在播的歌时从头播放（列表行为）。
 */
/** 批量添加到播放队列（不打断当前播放，按 id 去重） */
function persistQueue() {
  try { uni.setStorageSync('music_queue', JSON.stringify(state.queue)); } catch { /* ignore */ }
}

function addAllToQueue(songs: Song[]) {
  const exist = new Set(state.queue.map(s => s.id))
  const add = songs.filter(s => !exist.has(s.id))
  if (!add.length) {
    uni.showToast({ title: '这些歌都已经在播放列表里啦', icon: 'none' })
    return
  }
  state.queue = [...state.queue, ...add]
  persistQueue()
  uni.showToast({ title: `已添加 ${add.length} 首`, icon: 'none' })
}

/** 跳转到指定时间并继续播放（点歌词用） */
function seekPlay(sec: number) {
  seek(sec)
  if (state.url && audio && audio.paused) audio.play()
}

function play(song: Song, queue?: Song[]) {
  if (queue && queue.length) { state.queue = queue; persistQueue() }
  if (state.current && state.current.id === song.id) {
    replay()
    return
  }
  loadSong(song)
}

/** 按队列下标播放（自动循环取模） */
function playAt(index: number) {
  const len = state.queue.length
  if (!len) return
  const i = ((index % len) + len) % len
  const song = state.queue[i]
  if (state.current && state.current.id === song.id) replay()
  else loadSong(song)
}

/** 播放/暂停切换（播放器页大按钮） */
function toggle() {
  if (!state.current) return
  if (!state.playable || !state.url) {
    uni.showToast({ title: '暂无版权，无法播放', icon: 'none' })
    return
  }
  const ctx = ensureAudio()
  if (state.playing) ctx.pause()
  else ctx.play()
}

function next() {
  const i = indexOfCurrent()
  // 队列里找不到（外部直接 play(song) 未带队列）时重新播当前歌
  playAt(i >= 0 ? i + 1 : 0)
}

function prev() {
  const i = indexOfCurrent()
  playAt(i >= 0 ? i - 1 : 0)
}

/** 进度跳转（秒） */
function seek(sec: number) {
  if (!state.current || !state.playable) return
  const target = Math.max(0, Math.min(sec, state.duration || sec))
  state.currentTime = target
  if (audio && state.url) audio.seek(target)
  updateLyricIndex()
}

/** usePlayer()：模块级单例，所有页面共享同一份 state 与方法 */
export function usePlayer() {
  return {
    state,
    /** 播放进度 0~1 */
    progress: computed(() => (state.duration > 0 ? Math.min(state.currentTime / state.duration, 1) : 0)),
    play, addAllToQueue, seekPlay,
    playAt,
    toggle,
    next,
    prev,
    seek,
    replay,
  }
}

export type Player = ReturnType<typeof usePlayer>
