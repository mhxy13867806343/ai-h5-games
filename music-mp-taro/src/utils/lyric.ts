/** 单行歌词 */
export interface LyricLine {
  /** 秒 */
  time: number
  text: string
}

/** 时间标签：[mm:ss.xx] / [mm:ss.xxx] / [mm:ss] */
const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

/**
 * 解析 LRC 歌词文本。
 * - 支持一行多个时间标签（[01:02.03][01:22.03]同一句）
 * - 自动忽略 [ti:] / [ar:] / [by:] 等元数据行与空行
 * - 返回按时间升序的 { time(秒), text } 数组
 */
export function parseLyric(lrc?: string | null): LyricLine[] {
  if (!lrc || typeof lrc !== 'string') return []
  const result: LyricLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const text = line.replace(TIME_TAG, '').trim()
    TIME_TAG.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = TIME_TAG.exec(line)) !== null) {
      const mm = parseInt(m[1], 10)
      const ss = parseInt(m[2], 10)
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0
      if (Number.isFinite(mm) && Number.isFinite(ss) && text) {
        result.push({ time: mm * 60 + ss + ms / 1000, text })
      }
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

/** 根据当前播放时间（秒）定位应高亮的歌词行下标 */
export function findLyricIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return 0
  let idx = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= time + 0.25) {
      idx = i
    } else {
      break
    }
  }
  return idx
}
