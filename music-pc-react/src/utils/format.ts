import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

export const fmtCount = (n?: number) =>
  n == null ? '' : n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n);

export const fmtTime = (ms: number) => dayjs.duration(ms || 0).format('mm:ss');
