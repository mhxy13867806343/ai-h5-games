import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from 'antd-mobile';
import { api, type Playlist } from '../api';

export default function Rank() {
  const nav = useNavigate();
  const [lists, setLists] = useState<Playlist[]>([]);

  useEffect(() => {
    api.toplist().then(r => setLists(r.list.slice(0, 12))).catch(() => {});
  }, []);

  return (
    <div className="page-pad">
      <NavBar backArrow={false}>🏆 排行榜</NavBar>
      <div className="px-3 flex flex-col gap-3">
        {lists.map(t => (
          <div key={t.id} className="flex items-center gap-3.5 rounded-2xl p-3 bg-netease-card"
               onClick={() => nav(`/playlist/${t.id}`)}>
            <img src={t.coverImgUrl} className="w-[72px] h-[72px] rounded-xl object-cover" loading="lazy" alt="" />
            <div className="flex-1">
              <div className="text-[15px] font-bold">{t.name}</div>
              <div className="text-xs text-netease-sub mt-1">{t.updateFrequency || '官方榜'}</div>
            </div>
            <span className="text-netease-sub">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
