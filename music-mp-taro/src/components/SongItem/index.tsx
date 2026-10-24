import { View, Text } from '@tarojs/components'
import type { Song } from '../../api'
import { formatDuration } from '../../utils/format'
import './index.scss'

interface SongItemProps {
  song: Song
  index?: number
  /** 是否显示序号（歌单详情用） */
  showIndex?: boolean
  /** 该行是否为正在播放的歌曲 */
  playing?: boolean
  onClick?: (song: Song, index: number) => void
}

/** 通用歌曲行：序号 / 歌名 / 歌手·专辑 / 时长 */
export default function SongItem({
  song,
  index = 0,
  showIndex = false,
  playing = false,
  onClick
}: SongItemProps) {
  const active = playing
  return (
    <View className='song-item' onClick={() => onClick?.(song, index)}>
      {showIndex && (
        <Text className={`song-item__index ${active ? 'song-item__index--active' : ''}`}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      )}
      <View className='song-item__main'>
        <Text className={`song-item__name ${active ? 'song-item__name--active' : ''}`}>{song.name}</Text>
        <Text className='song-item__meta'>
          {song.artists || '未知歌手'}
          {song.albumName ? ` - ${song.albumName}` : ''}
        </Text>
      </View>
      {active ? (
        <View className='song-item__eq'>
          <View className='song-item__eq-bar' />
          <View className='song-item__eq-bar' />
          <View className='song-item__eq-bar' />
        </View>
      ) : (
        <Text className='song-item__duration'>{formatDuration(song.duration)}</Text>
      )}
    </View>
  )
}
