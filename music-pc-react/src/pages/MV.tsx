import { useEffect, useState } from 'react';
import { Tabs, Empty, Typography } from 'antd';
import { api2, mvWebUrl } from '../api';

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
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>MV</Typography.Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'first', label: '最新' }, { key: 'top', label: '全部' }, { key: 'reco', label: '推荐' },
      ]} />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {list.map(m => (
          <a key={m.id} href={mvWebUrl(m.id)} target="_blank" rel="noopener" className="block group">
            <div className="relative">
              <img src={m.cover} className="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
              <span className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center text-xs">▶</span>
            </div>
            <div className="text-sm text-white mt-2 group-hover:text-np-red">{m.name}</div>
            <div className="text-xs text-np-sub">{m.artistName || ''}</div>
          </a>
        ))}
      </div>
      {!list.length && <Empty description="暂无 MV 数据" />}
    </div>
  );
}
