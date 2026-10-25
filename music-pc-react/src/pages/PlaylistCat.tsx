import { useEffect, useState } from 'react';
import { Card, Tag, Typography, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api2 } from '../api';

export default function PlaylistCat() {
  const nav = useNavigate();
  const [hotTags, setHotTags] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [hq, setHq] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [cat, setCat] = useState('华语');
  const [loading, setLoading] = useState(true);

  const loadPlaylists = (c: string) => {
    setLoading(true); setPlaylists([]);
    fetch(`https://www.musicapi.cn/top/playlist?cat=${encodeURIComponent(c)}&limit=30`)
      .then(r => r.json()).then(r => setPlaylists(r.playlists || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    api2.catlist().then(r => setGroups(Object.values(r.all || {}).filter((x: any) => x.subs?.length))).catch(() => {});
    api2.playlistHot().then(r => setHotTags(r.tags || [])).catch(() => {});
    api2.highquality('华语', 12).then(r => setHq(r.playlists || [])).catch(() => {});
    loadPlaylists('华语');
  }, []);

  const grid = (arr: any[], h: number) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      {arr.map(p => (
        <Card key={p.id} hoverable size="small" style={{ background: '#1a1a20', borderColor: '#23232b' }}
              onClick={() => nav(`/playlist/${p.id}`)}
              cover={<img src={p.coverImgUrl} className="object-cover" style={{ height: h }} loading="lazy" alt="" />}>
          <Card.Meta title={<span className="text-xs text-white leading-snug line-clamp-2">{p.name}</span>} />
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>歌单分类</Typography.Title>
      <Typography.Title level={5} style={{ color: '#f5f5f7' }}>热门标签</Typography.Title>
      <div className="flex flex-wrap gap-2 mb-4">
        {hotTags.map(h => <Tag key={h.name} color="red" style={{ cursor: 'pointer' }} onClick={() => { setCat(h.name); loadPlaylists(h.name); }}>{h.name}</Tag>)}
      </div>
      <Typography.Title level={5} style={{ color: '#f5f5f7' }}>全部分类</Typography.Title>
      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map(g => g.subs.map((c: any) => (
          <Tag key={c.name} style={{ cursor: 'pointer' }} onClick={() => { setCat(c.name); loadPlaylists(c.name); }}>{c.name}</Tag>
        )))}
      </div>
      <Typography.Title level={5} style={{ color: '#f5f5f7' }}>精品歌单</Typography.Title>
      {grid(hq, 150)}
      <Typography.Title level={5} style={{ color: '#f5f5f7', marginTop: 24 }}>{cat} 歌单</Typography.Title>
      {loading ? <div className="grid place-items-center h-32"><Spin /></div> : grid(playlists, 150)}
    </div>
  );
}
