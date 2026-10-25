import { useEffect, useState } from 'react';
import { NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { api, api2 } from '../api';

const CATS = [{ t: '热门', v: -1 }, { t: '华语男', v: 1 }, { t: '华语女', v: 2 }, { t: '华语组合', v: 3 }, { t: '欧美男', v: 5 }, { t: '欧美女', v: 6 }, { t: '欧美组合', v: 7 }, { t: '日本男', v: 8 }, { t: '韩国男', v: 16 }];

export default function Artists() {
  const nav = useNavigate();
  const [type, setType] = useState(-1);
  const [artists, setArtists] = useState<any[]>([]);
  useEffect(() => {
    setArtists([]);
    const p = type === -1 ? api.topArtists(40) : api2.artistList(type, 40);
    p.then((r: any) => setArtists(r.artists || [])).catch(() => {});
  }, [type]);
  return (
    <div className="page-pad">
      <NavBar backArrow={false}>🎤 歌手</NavBar>
      <div className="flex flex-wrap gap-2 px-3 py-3">
        {CATS.map(c => (
          <span key={c.v} className={`px-3.5 py-1.5 rounded-full text-[13px] ${type === c.v ? 'bg-netease-red text-white' : 'bg-netease-card'}`}
                onClick={() => setType(c.v)}>{c.t}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 px-3">
        {artists.map(a => (
          <div key={a.id} className="text-center" onClick={() => nav(`/artist/${a.id}`)}>
            <img src={a.img1v1Url || a.picUrl} className="w-full aspect-square rounded-xl object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="text-xs mt-1.5 truncate">{a.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
