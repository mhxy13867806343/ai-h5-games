import { useEffect, useState } from 'react';
import { Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, type Playlist } from '../api';

export default function Rank() {
  const nav = useNavigate();
  const [lists, setLists] = useState<Playlist[]>([]);
  useEffect(() => { api.toplist().then(r => setLists((r?.list || []).slice(0, 16))); }, []);
  return (
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>排行榜</Typography.Title>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {lists.map(t => (
          <Card key={t.id} hoverable onClick={() => nav(`/playlist/${t.id}`)}
                style={{ background: '#1a1a20', borderColor: '#23232b' }}
                cover={<img src={t.coverImgUrl} className="h-[180px] object-cover" loading="lazy" alt="" />}>
            <Card.Meta title={<span className="text-white">{t.name}</span>}
                       description={<span className="text-xs">{t.updateFrequency || '官方榜'}</span>} />
          </Card>
        ))}
      </div>
    </div>
  );
}
