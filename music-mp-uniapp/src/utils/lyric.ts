/**
 * LRC 歌词解析：[mm:ss.xx]文本 时间轴 -> { time(秒), text }[]
 */
import type { LyricLine } from '../types/music'

/** 匹配 [12:34.56] / [12:34.567] / [12:34:56]，一行可带多个时间标签 */
const TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

export function parseLyric(lrc: string): LyricLine[] {
  if (!lrc) return []
  const lines: LyricLine[] = []

  for (const raw of lrc.split(/\r?\n/)) {
    if (!raw) continue
    const text = raw.replace(TAG_RE, '').trim()
    let m: RegExpExecArray | null
    // String.replace 结束后会复位 lastIndex，这里从 0 开始重新扫描时间标签
    TAG_RE.lastIndex = 0
    while ((m = TAG_RE.exec(raw)) !== null) {
      const min = Number(m[1])
      const sec = Number(m[2])
      const fracRaw = m[3] ?? '0'
      const frac = Number(fracRaw) / Math.pow(10, fracRaw.length)
      const time = min * 60 + sec + frac
      if (Number.isFinite(time) && time >= 0) {
        lines.push({ time, text })
      }
    }
  }

  // 过滤空行（间奏占位行），按时间排序
  return lines.filter((l) => l.text.length > 0).sort((a, b) => a.time - b.time)
}
