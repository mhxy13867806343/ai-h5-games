import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, DotLoading } from 'antd-mobile';
import { api, songArtists, songDuration, songCover, type Song, type Playlist } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import dur from 'dayjs/plugin/duration';
dayjs.extend(dur);

export default function Playlist() {
  const { id } = useParams();
  const nav = useNavigate();
  const player = usePlayer();
  const [pl, setPl] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const pid = Number(id);
      const [d, t] = await Promise.allSettled([api.playlistDetail(pid), api.playlistTracks(pid, 60)]);
      if (d.status === 'fulfilled') setPl(d.value.playlist);
      if (t.status === 'fulfilled') setTracks(t.value.songs);
      setLoading(false);
    })();
  }, [id]);

  const play = (i: number) => {
    player.playList(tracks.map(s => ({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    })), i);
    nav('/player');
  };

  return (
    <div className="page-pad">
      <NavBar onBack={() => nav(-1)}>歌单</NavBar>
      {pl && (
        <div className="flex gap-3.5 p-4 items-start">
          <div className="relative shrink-0">
            <img src={pl.coverImgUrl} className="w-[110px] h-[110px] rounded-2xl object-cover bg-netease-card" alt="" />
          </div>
          <img src={pl.coverImgUrl} className="w-[110px] h-[110px] rounded-2xl object-cover bg-netease-card" alt="" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold">{pl.name}</div>
            <div className="text-xs text-netease-sub my-1.5 flex items-center gap-2">
              {pl.trackCount || tracks.length} 首
              <button className="px-2 py-0.5 rounded-full border border-netease-red text-netease-red text-[10px]"
                      onClick={() => player.addList(tracks.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })))}>
                ＋ 添加全部
              </button>
            </div>
            {pl.description && <div className="text-[11px] text-netease-sub leading-relaxed line-clamp-3">{pl.description}</div>}
          </div>
        </div>
      )}
      <div className="px-3">
        {tracks.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 py-2.5 border-b border-white/5" onClick={() => play(i)}>
            <span className="w-6 text-center font-serif text-netease-sub">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{s.name}</div>
              <div className="text-xs text-netease-sub truncate">
                {songArtists(s)} · {dayjs.duration(songDuration(s)).format('mm:ss')}
              </div>
            </div>
            <span className="text-netease-sub">▷</span>
          </div>
        ))}
      </div>
      {loading && <div className="text-center py-8"><DotLoading color="primary" /></div>}
    </div>
  );
}
