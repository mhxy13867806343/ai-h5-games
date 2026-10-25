import { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slider, NoticeBar, DotLoading, Empty, Popup } from 'antd-mobile';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import dur from 'dayjs/plugin/duration';
dayjs.extend(dur);

const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');

export default function Player() {
  const player = usePlayer();
  const nav = useNavigate();
  const [queueOpen, setQueueOpen] = useState(false);
  const lyricBoxRef = useRef<HTMLDivElement>(null);

  const activeLyric = useMemo(() => {
    let idx = -1;
    player.lyrics.forEach((l, i) => { if (l.time <= player.currentTime + 0.3) idx = i; });
    return idx;
  }, [player.currentTime, player.lyrics]);

  // 歌词自动滚动到当前行
  useEffect(() => {
    const box = lyricBoxRef.current;
    if (!box) return;
    const el = box.children[activeLyric] as HTMLElement | undefined;
    if (el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [activeLyric]);

  if (!player.current) {
    return (
      <div className="page-pad grid place-items-center" style={{ minHeight: '80vh' }}>
        <Empty description="还没有播放的歌曲" />
        <button className="mt-4 text-netease-red text-sm" onClick={() => nav('/')}>去首页挑一首 →</button>
      </div>
    );
  }

  return (
    <div className="page-pad flex flex-col items-center px-5 pt-6">
      <div className={`w-[230px] h-[230px] rounded-full overflow-hidden border-8 border-black/60 ${player.playing ? '' : ''}`}
           style={{ boxShadow: '0 0 40px rgba(255,58,58,.2)' }}>
        <img src={player.current.cover} className="w-full h-full object-cover" style={{
          animation: player.playing ? 'spin 24s linear infinite' : 'none',
        }} alt="" />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="text-[19px] font-extrabold mt-5 text-center">{player.current.name}</div>
      <div className="text-[13px] text-netease-sub mt-1.5">{player.current.artist}</div>

      <div ref={lyricBoxRef} className="w-full h-[180px] overflow-y-auto mt-4 text-center" style={{ scrollbarWidth: 'none' }}>
        {player.lyrics.length ? player.lyrics.map((l, i) => (
          <p key={i} onClick={() => player.seekPlay(l.time)}
             className={`leading-8 transition-all cursor-pointer ${i === activeLyric ? 'text-white font-bold text-[15px]' : 'text-[#6b6b70] text-sm'}`}>
            {l.text || '♪'}
          </p>
        )) : <p className="text-white leading-8">纯音乐 / 暂无歌词</p>}
      </div>

      {player.unavailable && <NoticeBar content="该歌曲暂无版权或需 VIP，试试下一首" color="alert" className="rounded-xl" />}
      {player.loadingUrl && <div className="my-2"><DotLoading color="primary" /></div>}

      <div className="flex items-center gap-2.5 w-full mt-4 text-[11px] text-netease-sub">
        <span>{fmt(player.currentTime)}</span>
        <div className="flex-1">
          <Slider value={player.currentTime} max={player.duration || 1}
                  onChange={(v) => player.seek(typeof v === 'number' ? v : v[0])}
                  style={{ '--fill-color': '#ff3a3a' } as any} />
        </div>
        <span>{fmt(player.duration || player.current.duration)}</span>
      </div>

      <div className="flex items-center gap-9 mt-6">
        <span className="text-3xl" onClick={() => player.prev()}>⏮</span>
        <span className="w-[66px] h-[66px] rounded-full bg-netease-red flex items-center justify-center text-3xl"
              style={{ boxShadow: '0 10px 26px rgba(255,58,58,.4)' }}
              onClick={() => player.toggle()}>{player.playing ? '⏸' : '▶'}</span>
        <span className="text-3xl" onClick={() => player.next()}>⏭</span>
        <span className="text-2xl relative" onClick={() => setQueueOpen(true)}>
          ☰<i className="absolute -top-1 -right-2 text-[10px] not-italic text-netease-red">{player.list.length}</i>
        </span>
      </div>

      {/* 播放列表弹窗（App 同款底部弹层） */}
      <Popup visible={queueOpen} onMaskClick={() => setQueueOpen(false)} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '62vh', overflow: 'auto', background: '#1a1a20' }}>
        <div className="p-4">
          <div className="flex items-baseline gap-2 border-b border-white/10 pb-2 mb-2">
            <b className="text-white">当前播放</b><span className="text-xs text-netease-sub">{player.list.length} 首</span>
          </div>
          {player.list.map((q, i) => (
            <div key={q.id + '-' + i}
                 className={`flex items-center gap-2.5 py-2.5 px-3 text-sm ${q.id === player.current?.id ? 'bg-netease-red/10' : ''}`}
                 onClick={() => { player.playIndex(i); setQueueOpen(false); }}>
              <span className="w-6 font-serif text-np-sub">{i + 1}</span>
              <span className={`flex-1 truncate ${q.id === player.current?.id ? 'text-netease-red font-bold' : 'text-white'}`}>{q.name}</span>
              <span className="text-xs text-netease-sub">{q.artist}</span>
            </div>
          ))}
        </div>
      </Popup>
    </div>
  );
}
