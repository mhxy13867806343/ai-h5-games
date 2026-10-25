import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Table, Spin } from 'antd';
import { api, songArtists, songDuration, songCover, type Song, type Playlist } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

export default function PlaylistPage() {
  const { id } = useParams();
  const player = usePlayer();
  const [pl, setPl] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [d, t] = await Promise.all([api.playlistDetail(Number(id)), api.playlistTracks(Number(id), 50)]);
      setPl(d?.playlist || null);
      setTracks(t?.songs || []);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div>
      {pl && (
        <div className="flex gap-6 mb-6">
          <img src={pl.coverImgUrl} className="w-44 h-44 rounded-2xl object-cover" alt="" />
          <div>
            <Typography.Title level={3} style={{ color: '#f5f5f7' }}>{pl.name}</Typography.Title>
            <div className="text-np-sub text-sm">{pl.trackCount || tracks.length} 首</div>
            {pl.description && <p className="text-np-sub text-xs mt-3 max-w-2xl leading-relaxed">{pl.description}</p>}
          </div>
        </div>
      )}
      {loading ? <div className="grid place-items-center h-60"><Spin size="large" /></div> : (
        <Table rowKey="id" dataSource={tracks} size="small" pagination={{ pageSize: 20 }}
          onRow={(r, i) => ({ onClick: () => { if (i != null) player.playList(tracks.map(s => ({
            id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
          })), i); }, style: { cursor: 'pointer' } })}
          columns={[
            { title: '#', width: 60, render: (_: any, __: any, i: number) => i + 1 },
            { title: '歌曲', dataIndex: 'name', render: (v: string, r: Song) => (
                <span className="inline-flex items-center gap-2">
                  <img src={songCover(r)} className="w-9 h-9 rounded" alt="" />
                  <b className="text-white">{v}</b>
                </span>) },
            { title: '歌手', key: 'ar', render: (_: any, r: Song) => songArtists(r) },
            { title: '专辑', key: 'al', render: (_: any, r: Song) => r.al?.name || '-', ellipsis: true },
            { title: '时长', key: 'dt', width: 90, render: (_: any, r: Song) => dayjs.duration(songDuration(r)).format('mm:ss') },
          ]}
        />
      )}
    </div>
  );
}
