import { useEffect, useState } from 'react';
import { Card, Table, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api2, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';

export default function Recommend() {
  const nav = useNavigate();
  const player = usePlayer();
  const [recoPlaylists, setRecoPlaylists] = useState<any[]>([]);
  const [newsongs, setNewsongs] = useState<any[]>([]);
  const [djRadios, setDjRadios] = useState<any[]>([]);
  const [exclusives, setExclusives] = useState<any[]>([]);

  useEffect(() => {
    api2.personalized(12).then(r => setRecoPlaylists(r.result || [])).catch(() => {});
    api2.personalizedNewsong(12).then(r => setNewsongs(r.result || [])).catch(() => {});
    api2.djRecommend().then(r => setDjRadios((r.djRadios || []).slice(0, 12))).catch(() => {});
    api2.privateContent().then(r => setExclusives(r.result || [])).catch(() => {});
  }, []);

  const artistStr = (s: any) => (s.song?.artists || s.artists || []).map((a: any) => a.name).join('/');
  const playNewsong = (s: any) => {
    player.playSong({
      id: s.id, name: s.name, artist: artistStr(s),
      cover: s.song?.album?.picUrl || s.picUrl || '', duration: (s.song?.duration || 0) / 1000,
    });
  };

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>推荐</Typography.Title>
      <Typography.Title level={4} style={{ color: '#f5f5f7' }}>推荐歌单</Typography.Title>
      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {recoPlaylists.map(p => (
          <Card key={p.id} hoverable size="small" style={{ background: '#1a1a20', borderColor: '#23232b' }}
                onClick={() => nav(`/playlist/${p.id}`)}
                cover={<img src={p.picUrl} className="h-[150px] object-cover" loading="lazy" alt="" />}>
            <Card.Meta title={<span className="text-xs text-white leading-snug line-clamp-2">{p.name}</span>} />
          </Card>
        ))}
      </div>
      <Typography.Title level={4} style={{ color: '#f5f5f7' }}>推荐新音乐</Typography.Title>
      <Table rowKey="id" dataSource={newsongs} size="small" pagination={false}
             onRow={(r: any) => ({ onClick: () => playNewsong(r), style: { cursor: 'pointer' } })}
             columns={[
               { title: '歌曲', dataIndex: 'name', render: (v: string) => <b className="text-white">{v}</b> },
               { title: '歌手', key: 'ar', render: (_: any, r: any) => artistStr(r) },
             ]} />
      <Typography.Title level={4} style={{ color: '#f5f5f7', marginTop: 24 }}>推荐电台</Typography.Title>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {djRadios.map(d => (
          <div key={d.id} className="text-center">
            <img src={d.picUrl} className="w-full aspect-square rounded-2xl object-cover bg-np-card" loading="lazy" alt="" />
            <div className="text-xs mt-2 text-white leading-snug">{d.name}</div>
          </div>
        ))}
      </div>
      <Typography.Title level={4} style={{ color: '#f5f5f7', marginTop: 24 }}>独家放送</Typography.Title>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {exclusives.map(e => (
          <div key={e.id}>
            <img src={e.picUrl || e.cover} className="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
            <div className="text-sm text-white mt-2">{e.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
