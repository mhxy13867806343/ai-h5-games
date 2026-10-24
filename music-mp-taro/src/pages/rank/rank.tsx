import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Image, Text } from '@tarojs/components';
import { api, type Playlist } from '../../api';
import './rank.scss';

export default function Rank() {
  const [lists, setLists] = useState<Playlist[]>([]);
  useEffect(() => { api.toplist().then(r => setLists((r?.list || []).slice(0, 12))); }, []);
  return (
    <View className="page">
      {lists.map(t => (
        <View key={t.id} className="rank-card" onClick={() => Taro.navigateTo({ url: `/pages/playlist/playlist?id=${t.id}` })}>
          <Image src={t.coverImgUrl} mode="aspectFill" className="rank-cover" lazyLoad />
          <View className="rank-info">
            <View className="rank-name">{t.name}</View>
            <View className="rank-freq">{t.updateFrequency || '官方榜'}</View>
          </View>
          <Text className="arrow">→</Text>
        </View>
      ))}
      {!lists.length && <View className="empty">暂无数据</View>}
    </View>
  );
}
