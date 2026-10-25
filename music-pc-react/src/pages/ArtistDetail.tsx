import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Table, Typography } from 'antd';
import { api, api2, songArtists, songDuration, songCover, mvWebUrl, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import { fmtTime } from '../utils/format';

const songCols = [
  { title: '#', width: 60, render: (_: any, __: any, i: number) => <b style={{ color: i < 3 ? '#e8464f' : '#8e8e93' }}>{i + 1}</b> },
  { title: '歌曲', dataIndex: 'name', render: (v: string, r: Song) => (
      <span className="inline-flex items-center gap-2">
        <img src={songCover(r)} className="w-9 h-9 rounded" alt="" />
        <b className="text-white">{v}</b>
      </span>) },
  { title: '时长', width: 90, render: (_: any, r: Song) => fmtTime(songDuration(r)) },
];

export default function ArtistDetail() {
  const { id } = useParams();
  const aid = Number(id);
  const nav = useNavigate();
  const player = usePlayer();
  const [info, setInfo] = useState<any>(null);
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [mvs, setMvs] = useState<any[]>([]);
  const [descs, setDescs] = useState<any[]>([]);

  useEffect(() => {
    api2.artistDetail(aid).then(r => setInfo(r.data?.artist)).catch(() => {});
    api2.artistTopSong(aid).then(r => setTopSongs(r.songs || [])).catch(() => {});
    api2.artistAlbum(aid, 24).then(r => setAlbums(r.hotAlbums || [])).catch(() => {});
    api2.artistDesc(aid).then(r => setDescs(r.introduction || [])).catch(() => {});
    api2.artistMv(aid).then(r => setMvs(r.mvs || [])).catch(() => {});
    api.artistSongs(aid, 50).then(r => setAllSongs(r.songs || [])).catch(() => {});
  }, [aid]);

  const toMap = (songs: Song[]) => songs.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 }));
  const addAllTop = () => player.addList(toMap(topSongs));

  return (
    <div>
      {info && (
        <div className="flex items-center gap-6 mb-6">
          <img src={info.cover} className="w-28 h-28 rounded-full object-cover bg-np-card" alt="" />
          <div>
            <Typography.Title level={3} style={{ color: '#f5f5f7' }}>{info.name}</Typography.Title>
            <div className="text-np-sub text-sm">专辑 {info.albumSize} · MV {info.mvSize} · 歌曲 {info.musicSize}</div>
          </div>
        </div>
      )}
      <Tabs items={[
        { key: 'top', label: '热门50', children: (
            <>
              <button className="m-3 px-3 py-1.5 rounded-full border border-np-red text-np-red text-xs"
                      onClick={addAllTop}>＋ 添加 50 首到列表</button>
              <Table rowKey="id" dataSource={topSongs} size="small" pagination={false}
                     onRow={(r, i) => ({ onClick: () => { if (i != null) player.playList(toMap(topSongs), i); }, style: { cursor: 'pointer' } })}
                     columns={songCols} />
            </>
          ) },
        { key: 'all', label: '全部歌曲', children: (
            <Table rowKey="id" dataSource={allSongs} size="small" pagination={{ pageSize: 20 }}
                   onRow={(r, i) => ({ onClick: () => { if (i != null) player.playList(toMap(allSongs), i); }, style: { cursor: 'pointer' } })}
                   columns={songCols} />) },
        { key: 'albums', label: '专辑', children: (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {albums.map(a => (
                <div key={a.id} className="text-center">
                  <img src={a.picUrl} className="w-full aspect-square rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
                  <div className="text-xs mt-2 text-white leading-snug">{a.name}</div>
                </div>))}
            </div>) },
        { key: 'mv', label: 'MV', children: (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {mvs.map(m => (
                <a key={m.id} href={mvWebUrl(m.id)} target="_blank" rel="noopener" className="block group">
                  <img src={m.cover} className="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
                  <div className="text-sm text-white mt-2 group-hover:text-np-red">{m.name}</div>
                </a>))}
            </div>) },
        { key: 'desc', label: '简介', children: (
            <div className="text-np-sub text-sm leading-relaxed whitespace-pre-wrap max-w-3xl">
              {descs.map((d, i) => <div key={i}>{d.ti && <b className="text-white block mt-3">{d.ti}</b>}{d.txt}</div>)}
            </div>) },
      ]} />
    </div>
  );
}
