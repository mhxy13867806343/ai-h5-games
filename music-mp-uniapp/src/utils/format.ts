/**
 * 时间与数字格式化（时间处理统一 dayjs）。
 */
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

/**
 * 毫秒时长 -> mm:ss（满一小时为 HH:mm:ss）。
 * 用 utc 插件避免本地时区偏移影响分钟数。
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00'
  return dayjs.utc(ms).format(ms >= 3600000 ? 'HH:mm:ss' : 'mm:ss')
}

/** 秒 -> mm:ss（播放器进度用） */
export function formatDurationSec(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '00:00'
  return formatDurationMs(Math.round(sec * 1000))
}

/** 播放数 -> 「1.2万 / 3.4亿」，小于 1 万返回原数字 */
export function formatPlayCount(n?: number): string {
  if (!Number.isFinite(Number(n)) || !n || n <= 0) return ''
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}
