import { useEffect, useState } from 'react';
import { NavBar, Tag, Grid, DotLoading } from 'antd-mobile';
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

  return (
    <div className="page-pad">
      <NavBar onBack={() => nav(-1)}>📂 歌单分类</NavBar>
      <div className="sec-title">热门标签</div>
      <div className="flex flex-wrap gap-2 px-3">
        {hotTags.map(h => <Tag key={h.name} color="primary" onClick={() => { setCat(h.name); loadPlaylists(h.name); }}>{h.name}</Tag>)}
      </div>
      <div className="sec-title">全部分类</div>
      <div className="flex flex-wrap gap-2 px-3">
        {groups.map(g => g.subs.map((c: any) => (
          <Tag key={c.name} onClick={() => { setCat(c.name); loadPlaylists(c.name); }}>{c.name}</Tag>
        )))}
      </div>
      <div className="sec-title">精品歌单</div>
      <Grid columns={3} gap={12}>
        {hq.map(p => (
          <Grid.Item key={p.id} onClick={() => nav(`/playlist/${p.id}`)}>
            <img src={p.coverImgUrl} className="w-full aspect-square rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-[11px] mt-1 leading-tight line-clamp-2">{p.name}</div>
          </Grid.Item>
        ))}
      </Grid>
      <div className="sec-title">{cat} 歌单</div>
      <Grid columns={3} gap={12}>
        {playlists.map(p => (
          <Grid.Item key={p.id} onClick={() => nav(`/playlist/${p.id}`)}>
            <img src={p.coverImgUrl} className="w-full aspect-square rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-[11px] mt-1 leading-tight line-clamp-2">{p.name}</div>
          </Grid.Item>
        ))}
      </Grid>
      {loading && <div className="text-center py-6"><DotLoading color="primary" /></div>}
    </div>
  );
}
