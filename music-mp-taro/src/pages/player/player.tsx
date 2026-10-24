import { useMemo, useState } from 'react';
import { View, Image, ScrollView, Slider, Text } from '@tarojs/components';
import { usePlayer } from '../../hooks/usePlayer';
import { fmtTime } from '../../utils/format';
import './player.scss';

export default function Player() {
  const player = usePlayer();
  const [seeking, setSeeking] = useState(0);
  const cur = player.current;

  const activeLyric = useMemo(() => {
    let idx = -1;
    player.lyrics.forEach((l, i) => { if (l.time <= player.currentTime + 0.3) idx = i; });
    return idx;
  }, [player.currentTime, player.lyrics, player.version]);

  if (!cur) return <View className="empty">还没有播放的歌曲</View>;

  return (
    <View className="page">
      <View className={`disc ${player.playing ? 'spin' : ''}`}>
        <Image src={cur.cover} mode="aspectFill" className="cover" />
      </View>
      <View className="title">{cur.name}</View>
      <View className="artist">{cur.artist}</View>

      {player.unavailable && <View className="notice">该歌曲暂无版权或需 VIP，试试下一首</View>}

      <ScrollView scrollY scrollIntoView={`lyric-${activeLyric}`} scrollWithAnimation className="lyrics">
        {player.lyrics.length ? player.lyrics.map((l, i) => (
          <View key={i} id={`lyric-${i}`} className={`lyric-line ${i === activeLyric ? 'on' : ''}`}>{l.text || '♪'}</View>
        )) : <View className="lyric-line on">纯音乐 / 暂无歌词</View>}
      </ScrollView>

      <View className="progress">
        <Text className="time">{fmtTime(player.currentTime)}</Text>
        <Slider className="slider" value={seeking || player.currentTime} max={player.duration || cur.duration || 100}
                activeColor="#ff3a3a" blockSize={20}
                onChanging={v => setSeeking(v.detail.value)}
                onChange={v => { player.seek(v.detail.value); setSeeking(0); }} />
        <Text className="time">{fmtTime(player.duration || cur.duration)}</Text>
      </View>

      <View className="controls">
        <Text className="ctrl" onClick={() => player.prev()}>⏮</Text>
        <Text className="ctrl main" onClick={() => player.toggle()}>{player.playing ? '⏸' : '▶'}</Text>
        <Text className="ctrl" onClick={() => player.next()}>⏭</Text>
      </View>
    </View>
  );
}
