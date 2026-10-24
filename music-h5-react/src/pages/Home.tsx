import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from 'antd-mobile';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import dur from 'dayjs/plugin/duration';
dayjs.extend(dur);

const fmtCount = (n?: number) => n == null ? '' : n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n);
const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

export default function Home() {
  const nav = useNavigate();
  const player = usePlayer();
  const [banners, setBanners] = useState<{ pic: string }[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      const el = trackRef.current;
      if (!el || !banners.length) return;
      const next = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 ? 0 : el.scrollLeft + el.clientWidth;
      el.scrollTo({ left: next, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(timer);
  }, [banners]);

  useEffect(() => {
    (async () => {
      const [b, p, n] = await Promise.allSettled([api.banner(), api.topPlaylist(12), api.newSongs()]);
      if (b.status === 'fulfilled') setBanners(b.value.banners.slice(0, 6));
      if (p.status === 'fulfilled') setPlaylists(p.value.playlists);
      if (n.status === 'fulfilled') setNewSongs(n.value.data);
    })();
  }, []);

  const playSong = async (s: Song) => {
    await player.playSong({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    });
  };

  return (
    <div className="page-pad">
      <NavBar backArrow={false}>🎧 云音乐 · React</NavBar>

      {/* 轮播（横向滑动，自动轮播） */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" ref={bannerRef}>
        <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }} ref={trackRef}>
          {banners.map(b => (
            <img key={b.pic} src={b.pic} className="w-full h-[150px] object-cover snap-center shrink-0" alt="" />
          ))}
        </div>
      </div>

      <div className="sec-title">热门歌单</div>
      <div className="flex gap-3 overflow-x-auto px-3">
        {playlists.map(p => (
          <div key={p.id} className="w-[108px] shrink-0" onClick={() => nav(`/playlist/${p.id}`)}>
            <img src={p.coverImgUrl} className="w-[108px] h-[108px] rounded-xl object-cover bg-netease-card" loading="lazy" alt="" />
            <div className="mt-1.5 text-xs leading-tight h-11 overflow-hidden">{p.name}</div>
            <div className="text-[10px] text-netease-sub">▶ {fmtCount(p.playCount)}</div>
          </div>
        ))}
      </div>

      <div className="sec-title">新歌速递</div>
      <div className="px-3">
        {newSongs.slice(0, 10).map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-white/5" onClick={() => playSong(s)}>
            <span className={`w-6 font-serif font-bold ${i < 3 ? 'text-netease-red' : 'text-netease-sub'}`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{s.name}</div>
              <div className="text-xs text-netease-sub truncate">{songArtists(s)} · {fmtTime(songDuration(s))}</div>
            </div>
            <span className="text-netease-red">▶</span>
          </div>
        ))}
      </div>
    </div>
  );
}
