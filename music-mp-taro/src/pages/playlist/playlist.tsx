import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Image, ScrollView } from '@tarojs/components';
import { api, songArtists, songDuration, songCover, type Song, type Playlist } from '../../api';
import { usePlayer } from '../../hooks/usePlayer';
import { fmtTime } from '../../utils/format';
import './playlist.scss';

export default function PlaylistPage() {
  const { params } = useRouter();
  const player = usePlayer();
  const id = Number(params.id);
  const [pl, setPl] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);

  useEffect(() => {
    (async () => {
      const [d, t] = await Promise.all([api.playlistDetail(id), api.playlistTracks(id, 30)]);
      setPl(d?.playlist || null);
      setTracks(t?.songs || []);
    })();
  }, [id]);

  const play = (i: number) => {
    player.playList(tracks.map(s => ({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    })), i).then(() => Taro.navigateTo({ url: '/pages/player/player' }));
  };

  return (
    <View className="page">
      {pl && (
        <View className="head">
          <Image src={pl.coverImgUrl} mode="aspectFill" className="head-cover" />
          <View className="head-info">
            <View className="title">{pl.name}</View>
            <View className="meta">{pl.trackCount || tracks.length} 首</View>
            {pl.description ? <ScrollView scrollY className="desc">{pl.description}</ScrollView> : null}
          </View>
        </View>
      )}
      <View className="song-list">
        {tracks.map((s, i) => (
          <View key={s.id} className="song-row" onClick={() => play(i)}>
            <View className="song-idx">{i + 1}</View>
            <View className="song-info">
              <View className="song-name">{s.name}</View>
              <View className="song-meta">{songArtists(s)} · {fmtTime(songDuration(s))}</View>
            </View>
            <View className="song-play">▷</View>
          </View>
        ))}
        {!tracks.length && <View className="empty">曲目暂不可用（接口限流或歌单过新）</View>}
      </View>
    </View>
  );
}
