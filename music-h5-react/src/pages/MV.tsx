import { useEffect, useState } from 'react';
import { NavBar, Tabs, Empty } from 'antd-mobile';
import { api2, mvWebUrl } from '../api';

const TABS = [{ k: 'first', t: '最新' }, { k: 'top', t: '全部' }, { k: 'reco', t: '推荐' }];

export default function MV() {
  const [tab, setTab] = useState('first');
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    setList([]);
    if (tab === 'first') api2.mvFirst(30).then(r => setList((r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName }))));
    else if (tab === 'top') api2.topMv(30).then(r => setList((r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName }))));
    else api2.personalizedMv(20).then(r => setList((r.result || []).map((x: any) => ({ id: x.id, cover: x.picUrl, name: x.name, artistName: x.artistName }))));
  }, [tab]);
  return (
    <div className="page-pad">
      <NavBar backArrow={false}>🎬 MV</NavBar>
      <Tabs activeKey={tab} onChange={setTab}>
        {TABS.map(t => <Tabs.Tab key={t.k} title={t.t}>
          <div className="grid grid-cols-2 gap-3 p-3">
            {list.map(m => (
              <a key={m.id} href={mvWebUrl(m.id)} target="_blank" rel="noopener" className="block">
                <div className="relative">
                  <img src={m.cover} className="w-full aspect-video rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
                  <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-black/55 text-white text-[10px] flex items-center justify-center">▶</span>
                </div>
                <div className="text-xs mt-1.5 leading-tight line-clamp-2">{m.name}</div>
                <div className="text-[10px] text-netease-sub">{m.artistName || ''}</div>
              </a>
            ))}
          </div>
          {!list.length && <Empty description="暂无 MV 数据" style={{ padding: 40 }} />}
        </Tabs.Tab>)}
      </Tabs>
    </div>
  );
}
