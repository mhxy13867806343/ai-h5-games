import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, Tabs, DotLoading } from 'antd-mobile';
import { api, api2, songArtists, songDuration, songCover, mvWebUrl, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

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

  const playList = (songs: Song[], i: number) => {
    player.playList(songs.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })), i);
    nav('/player');
  };

  return (
    <div className="page-pad">
      <NavBar onBack={() => nav(-1)}>歌手</NavBar>
      {info && (
        <div className="flex items-center gap-4 p-4">
          <img src={info.cover} className="w-24 h-24 rounded-full object-cover bg-netease-card" alt="" />
          <div>
            <div className="text-xl font-extrabold text-white">{info.name}</div>
            <div className="text-xs text-netease-sub mt-1.5">专辑 {info.albumSize} · MV {info.mvSize} · 歌曲 {info.musicSize}</div>
          </div>
        </div>
      )}
      <Tabs>
        <Tabs.Tab title="热门50">
          {topSongs.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5" onClick={() => playList(topSongs, i)}>
              <span className={`w-6 font-serif ${i < 3 ? 'text-netease-red' : 'text-netease-sub'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.name}</div>
                <div className="text-xs text-netease-sub">{songArtists(s)} · {fmtTime(songDuration(s))}</div>
              </div>
            </div>
          ))}
          {!topSongs.length && <div className="text-center py-8 text-netease-sub"><DotLoading /></div>}
        </Tabs.Tab>
        <Tabs.Tab title="全部歌曲">
          {allSongs.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5" onClick={() => playList(allSongs, i)}>
              <span className="w-6 font-serif text-netease-sub">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.name}</div>
                <div className="text-xs text-netease-sub">{fmtTime(songDuration(s))}</div>
              </div>
            </div>
          ))}
        </Tabs.Tab>
        <Tabs.Tab title="专辑">
          <div className="grid grid-cols-3 gap-3 p-3">
            {albums.map(a => (
              <div key={a.id} className="text-center">
                <img src={a.picUrl} className="w-full aspect-square rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
                <div className="text-[11px] mt-1 leading-tight">{a.name}</div>
              </div>
            ))}
          </div>
        </Tabs.Tab>
        <Tabs.Tab title="MV">
          <div className="grid grid-cols-2 gap-3 p-3">
            {mvs.map(m => (
              <a key={m.id} href={mvWebUrl(m.id)} target="_blank" rel="noopener" className="block">
                <img src={m.cover} className="w-full aspect-video rounded-lg object-cover bg-netease-card" loading="lazy" alt="" />
                <div className="text-xs mt-1 truncate">{m.name}</div>
              </a>
            ))}
          </div>
        </Tabs.Tab>
        <Tabs.Tab title="简介">
          <div className="px-4 py-3 text-[13px] text-netease-sub leading-relaxed whitespace-pre-wrap">
            {descs.map((d, i) => <div key={i}>{d.ti && <b className="text-white block mt-2">{d.ti}</b>}{d.txt}</div>)}
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
