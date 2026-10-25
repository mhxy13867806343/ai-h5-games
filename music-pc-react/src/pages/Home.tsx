import { useEffect, useState } from 'react';
import { Card, Carousel, Table, Tag, Typography } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import { fmtCount } from '../utils/format';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

export default function Home() {
  const nav = useNavigate();
  const player = usePlayer();
  const [banners, setBanners] = useState<{ pic: string }[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);

  useEffect(() => {
    (async () => {
      const [b, p, n] = await Promise.allSettled([api.banner(), api.topPlaylist(12), api.newSongs()]);
      if (b.status === 'fulfilled') setBanners(b.value.banners.map((x: any) => ({ pic: x.pic || x.imageUrl || x.bigImageUrl || '' })).slice(0, 8));
      if (p.status === 'fulfilled') setPlaylists(p.value.playlists);
      if (n.status === 'fulfilled') setNewSongs(n.value.data);
    })();
  }, []);

  const play = (i: number) => {
    player.playList(newSongs.map(s => ({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    })), i);
  };

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#f5f5f7' }}>发现音乐</Typography.Title>

      <Carousel autoplay className="rounded-xl overflow-hidden mb-6" style={{ background: '#1a1a20' }}>
        {banners.map(b => (
          <div key={b.pic}>
            <img src={b.pic} className="w-full h-[300px] object-cover" alt="" />
          </div>
        ))}
      </Carousel>

      <Typography.Title level={4} style={{ color: '#f5f5f7' }}>热门歌单</Typography.Title>
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {playlists.map(p => (
          <Card key={p.id} hoverable size="small" className="text-center" style={{ background: '#1a1a20', borderColor: '#23232b' }}
                onClick={() => nav(`/playlist/${p.id}`)}
                cover={<img src={p.coverImgUrl} className="h-[160px] object-cover" loading="lazy" alt="" />}>
            <Card.Meta title={<span className="text-xs text-white leading-snug line-clamp-2">{p.name}</span>}
                       description={<span className="text-[11px]">▶ {fmtCount(p.playCount)}</span>} />
          </Card>
        ))}
      </div>

      <Typography.Title level={4} style={{ color: '#f5f5f7' }}>新歌速递</Typography.Title>
      <Table
        rowKey="id" dataSource={newSongs} size="small" pagination={{ pageSize: 10 }}
        onRow={(record, index) => ({ onClick: () => index != null && play(index), style: { cursor: 'pointer' } })}
        columns={[
          {
            title: '#', width: 60, render: (_: any, __: any, i: number) => <b style={{ color: i < 3 ? '#e8464f' : '#8e8e93' }}>{i + 1}</b>,
          },
          {
            title: '歌曲', dataIndex: 'name',
            render: (v: string, r: Song) => (
              <span className="inline-flex items-center gap-2">
                <img src={songCover(r)} className="w-9 h-9 rounded" alt="" />
                <b className="text-white">{v}</b>
              </span>
            ),
          },
          { title: '歌手', key: 'ar', render: (_: any, r: Song) => songArtists(r) },
          { title: '专辑', key: 'al', render: (_: any, r: Song) => r.al?.name || '-', ellipsis: true },
          { title: '时长', key: 'dt', width: 90, render: (_: any, r: Song) => fmtTime(songDuration(r)) },
          { title: '', key: 'play', width: 60, render: () => <PlayCircleFilled style={{ color: '#e8464f' }} /> },
        ]}
      />
      <div className="mt-2"><Tag>点击行即播放</Tag><Tag color="red">数据来自免登录接口</Tag></div>
    </div>
  );
}
