/**
 * 全局配置。
 *
 * API_BASE 为空字符串时处于「离线快照模式」：
 * 所有请求直接失败，fetchOrSnapshot 回退到 music-shared/snapshot.json 的同名 key。
 *
 * 自建 NeteaseCloudMusicApi 服务后，改成例如：
 *   export const API_BASE = 'http://192.168.1.100:3000'
 * （微信开发者工具需勾选「不校验合法域名」，真机请配置合法域名或开调试模式）
 */
export const API_BASE = ''

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 8000

/** 搜索历史 storage key */
export const SEARCH_HISTORY_KEY = 'music_search_history'

/** 搜索历史最多保留条数 */
export const SEARCH_HISTORY_MAX = 10
