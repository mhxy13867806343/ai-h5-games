import { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { Tag, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, api2 } from '../api';

const CATS = [{ t: '热门', v: -1 }, { t: '华语男', v: 1 }, { t: '华语女', v: 2 }, { t: '华语组合', v: 3 }, { t: '欧美男', v: 5 }, { t: '欧美女', v: 6 }, { t: '欧美组合', v: 7 }, { t: '日本男', v: 8 }, { t: '韩国男', v: 16 }];

export default function Artists() {
  const nav = useNavigate();
  const [type, setType] = useState(-1);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setArtists([]);
    const p = type === -1 ? api.topArtists(40) : api2.artistList(type, 40);
    p.then((r: any) => setArtists(r.artists || [])).finally(() => setLoading(false));
  }, [type]);

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>歌手</Typography.Title>
      <div className="flex flex-wrap gap-2 mb-5">
        {CATS.map(c => <Tag key={c.v} color={type === c.v ? 'red' : 'default'} style={{ cursor: 'pointer' }} onClick={() => setType(c.v)}>{c.t}</Tag>)}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {artists.map(a => (
          <div key={a.id} className="text-center cursor-pointer group" onClick={() => nav(`/artist/${a.id}`)}>
            <img src={a.img1v1Url || a.picUrl} className="w-full aspect-square rounded-2xl object-cover bg-np-card group-hover:scale-[1.03] transition" loading="lazy" alt="" />
            <div className="text-sm mt-2 text-white">{a.name}</div>
          </div>
        ))}
      </div>
      {loading && <div className="grid place-items-center h-32"><Spin /></div>}
    </div>
  );
}
