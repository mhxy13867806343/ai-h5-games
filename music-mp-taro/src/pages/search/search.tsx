import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Input } from '@tarojs/components';
import { api, songArtists, songDuration, songCover, type Song } from '../../api';
import { usePlayer } from '../../hooks/usePlayer';
import './search.scss';

export default function Search() {
  const player = usePlayer();
  const [kw, setKw] = useState('');
  const [hots, setHots] = useState<{ first: string }[]>([]);
  const [results, setResults] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(Taro.getStorageSync('taro_music_history') || []);

  useEffect(() => { api.searchHot().then(r => setHots((r?.result?.hots || []).slice(0, 12))); }, []);

  const doSearch = async (k?: string) => {
    const word = (k ?? kw).trim();
    if (!word) return;
    setKw(word);
    setSearched(true);
    const h = [word, ...history.filter(x => x !== word)].slice(0, 8);
    setHistory(h);
    Taro.setStorageSync('taro_music_history', h);
    const r = await api.search(word);
    setResults(r?.result?.songs || []);
  };

  const play = (i: number) => {
    player.playList(results.map(s => ({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    })), i).then(() => Taro.navigateTo({ url: '/pages/player/player' }));
  };

  return (
    <View className="page">
      <View className="search-bar">
        <Input value={kw} onInput={e => setKw(e.detail.value)} onConfirm={() => doSearch()}
               placeholder="搜索歌曲 / 歌手" placeholderClass="ph" className="input" confirmType="search" />
        <View className="btn" onClick={() => doSearch()}>搜索</View>
      </View>
      {!searched ? (
        <View>
          <View className="sec-title">热搜</View>
          <View className="tags">
            {hots.map(h => <View key={h.first} className="tag" onClick={() => doSearch(h.first)}>{h.first}</View>)}
          </View>
          {history.length > 0 && <View className="sec-title">搜索历史</View>}
          <View className="tags">
            {history.map(h => <View key={h} className="tag dim" onClick={() => doSearch(h)}>{h}</View>)}
          </View>
        </View>
      ) : (
        <View className="song-list">
          {results.map((s, i) => (
            <View key={s.id} className="song-row" onClick={() => play(i)}>
              <View className="song-info">
                <View className="song-name">{s.name}</View>
                <View className="song-meta">{songArtists(s)}</View>
              </View>
              <View className="song-play">▶</View>
            </View>
          ))}
          {!results.length && <View className="empty">没有找到相关歌曲</View>}
        </View>
      )}
    </View>
  );
}
