import { useEffect, useState } from 'react';
import { NavBar } from 'antd-mobile';
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
    api2.djRecommend().then(r => setDjRadios((r.djRadios || []).slice(0, 10))).catch(() => {});
    api2.privateContent().then(r => setExclusives(r.result || [])).catch(() => {});
  }, []);

  const artistStr = (s: any) => (s.song?.artists || s.artists || []).map((a: any) => a.name).join('/');
  const playNewsong = (s: any) => {
    player.playSong({ id: s.id, name: s.name, artist: artistStr(s), cover: s.song?.album?.picUrl || s.picUrl || '', duration: (s.song?.duration || 0) / 1000 });
  };

  return (
    <div className="page-pad">
      <NavBar backArrow={false}>🔥 推荐</NavBar>
      <div className="sec-title">推荐歌单</div>
      <div className="flex gap-3 overflow-x-auto px-3">
        {recoPlaylists.map(p => (
          <div key={p.id} className="w-[108px] shrink-0" onClick={() => nav(`/playlist/${p.id}`)}>
            <img src={p.picUrl} className="w-[108px] h-[108px] rounded-xl object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-xs mt-1.5 leading-tight h-11 overflow-hidden">{p.name}</div>
          </div>
        ))}
      </div>
      <div className="sec-title">推荐新音乐</div>
      <div className="px-3">
        {newsongs.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-1 py-2 border-b border-white/5" onClick={() => playNewsong(s)}>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{s.name}</div>
              <div className="text-xs text-netease-sub">{artistStr(s)}</div>
            </div>
            <span className="text-netease-red">▶</span>
          </div>
        ))}
      </div>
      <div className="sec-title">推荐电台</div>
      <div className="flex gap-3 overflow-x-auto px-3">
        {djRadios.map(d => (
          <div key={d.id} className="w-[108px] shrink-0">
            <img src={d.picUrl} className="w-[108px] h-[108px] rounded-xl object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-xs mt-1.5 leading-tight h-11 overflow-hidden">{d.name}</div>
          </div>
        ))}
      </div>
      {exclusives.length > 0 && <div className="sec-title">独家放送</div>}
      <div className="grid grid-cols-2 gap-3 px-3">
        {exclusives.map(e => (
          <div key={e.id}>
            <img src={e.picUrl || e.cover} className="w-full aspect-video rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-xs mt-1.5 leading-tight">{e.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
