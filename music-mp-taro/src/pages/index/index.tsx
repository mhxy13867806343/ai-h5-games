import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Image, ScrollView, Text } from '@tarojs/components';
import { api, songArtists, songDuration, songCover, type Song } from '../../api';
import { usePlayer } from '../../hooks/usePlayer';
import { fmtTime, fmtCount } from '../../utils/format';
import './index.scss';

export default function Index() {
  const player = usePlayer();
  const [banners, setBanners] = useState<{ pic: string }[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<{ id: number; name: string; picUrl?: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [b, p, n, a] = await Promise.all([
        api.banner(), api.topPlaylist(10), api.newSongs(), api.topArtists(10),
      ]);
      setBanners((b?.banners || []).slice(0, 6));
      setPlaylists(p?.playlists || []);
      setNewSongs((n?.data || []).slice(0, 10));
      setArtists(a?.artists || []);
    })();
  }, []);

  const playSong = (s: Song) => {
    player.playSong({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })
      .then(() => Taro.navigateTo({ url: '/pages/player/player' }));
  };

  return (
    <View className="page">
      <ScrollView scrollX className="banner" enhanced showScrollbar={false}>
        {banners.map(b => <Image key={b.pic} src={b.pic} mode="aspectFill" className="banner-img" />)}
      </ScrollView>

      <View className="sec-title">热门歌单</View>
      <ScrollView scrollX className="pl-scroll" enhanced showScrollbar={false}>
        {playlists.map(p => (
          <View key={p.id} className="pl-card" onClick={() => Taro.navigateTo({ url: `/pages/playlist/playlist?id=${p.id}` })}>
            <Image src={p.coverImgUrl} mode="aspectFill" className="pl-cover" lazyLoad />
            <View className="pl-name">{p.name}</View>
            <View className="pl-count">▶ {fmtCount(p.playCount)}</View>
          </View>
        ))}
      </ScrollView>

      <View className="sec-title">热门歌手</View>
      <ScrollView scrollX className="pl-scroll" enhanced showScrollbar={false}>
        {artists.map(a => (
          <View key={a.id} className="ar-card">
            <Image src={a.picUrl} mode="aspectFill" className="ar-avatar" lazyLoad />
            <View className="pl-name">{a.name}</View>
          </View>
        ))}
      </ScrollView>

      <View className="sec-title">新歌速递</View>
      <View className="song-list">
        {newSongs.map((s, i) => (
          <View key={s.id} className="song-row" onClick={() => playSong(s)}>
            <Text className={`song-idx ${i < 3 ? 'hot' : ''}`}>{i + 1}</Text>
            <View className="song-info">
              <View className="song-name">{s.name}</View>
              <View className="song-meta">{songArtists(s)} · {fmtTime(songDuration(s))}</View>
            </View>
            <Text className="song-play">▶</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
