import { Slider, Tooltip, Drawer, Tabs } from 'antd';
import { PlayCircleFilled, PauseCircleFilled, StepBackwardFilled, StepForwardFilled, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons';
import { usePlayer } from '../hooks/usePlayer';
import { useMemo, useRef, useEffect, useState } from 'react';
import { message } from 'antd';
import { api2 } from '../api';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');

export default function PlayerBar() {
  const player = usePlayer();
  const [seek, setSeek] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [hotComments, setHotComments] = useState<any[]>([]);
  const lyricBoxRef = useRef<HTMLDivElement>(null);

  const activeLyric = useMemo(() => {
    let idx = -1;
    player.lyrics.forEach((l, i) => { if (l.time <= player.currentTime + 0.3) idx = i; });
    return idx;
  }, [player.currentTime, player.lyrics, player.version]);

  useEffect(() => {
    if (!player.current) return;
    const id = player.current.id;
    setComments([]); setHotComments([]);
    api2.commentMusic(id, 20).then(r => setComments(r.comments || [])).catch(() => {});
    api2.commentHot(id).then(r => setHotComments(r.hotComments || [])).catch(() => {});
  }, [player.current?.id]);

  useEffect(() => {
    const box = lyricBoxRef.current;
    if (!box) return;
    const el = box.children[activeLyric] as HTMLElement | undefined;
    if (el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [activeLyric, drawerOpen]);

  if (!player.current) return null;
  const cur = seek ?? player.currentTime;
  const max = player.duration || player.current.duration || 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 px-6 py-3 border-t"
         style={{ background: 'rgba(16,16,20,.97)', borderColor: '#23232b', backdropFilter: 'blur(10px)' }}>
      <img src={player.current.cover} className={`w-11 h-11 rounded-lg object-cover ${player.playing ? '' : ''}`}
           style={player.playing ? { animation: 'spin 14s linear infinite' } : {}} alt="" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="w-44 min-w-0">
        <div className="text-sm text-white truncate">{player.current.name}</div>
        <div className="text-xs text-np-sub truncate">{player.current.artist}</div>
      </div>
      <Tooltip title={player.unavailable ? '暂无版权，无法播放' : ''}>
        <span className="text-3xl text-white cursor-pointer" onClick={() => player.toggle()}>
          {player.playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
        </span>
      </Tooltip>
      <StepBackwardFilled className="text-xl text-white cursor-pointer" onClick={() => player.prev()} />
      <StepForwardFilled className="text-xl text-white cursor-pointer" onClick={() => player.next()} />
      <FileTextOutlined className="text-lg cursor-pointer" style={{ color: '#c7c7cc' }}
                        title="歌词" onClick={() => setDrawerOpen(true)} />
      <UnorderedListOutlined className="text-lg cursor-pointer" style={{ color: '#c7c7cc' }}
                             title="播放列表" onClick={() => setDrawerOpen(true)} />
      <span className="text-xs text-np-sub w-10 text-right">{fmt(cur)}</span>
      <Slider className="flex-1" min={0} max={max || 100}
              value={cur} onChange={(v: number) => setSeek(v)}
              onChangeComplete={(v: number) => { player.seek(v as number); setSeek(null); }}
              tooltip={{ open: false }} />
      <span className="text-xs text-np-sub w-10">{fmt(max)}</span>
      {player.unavailable && <span className="text-xs text-yellow-500">该歌曲暂无版权</span>}

      <Drawer title={`${player.current.name} - ${player.current.artist}`} placement="right" width={420}
              open={drawerOpen} onClose={() => setDrawerOpen(false)} styles={{ body: { padding: 0 } }}>
        <Tabs
          items={[
            {
              key: 'comments', label: '评论', children: (
                <div className="h-[70vh] overflow-y-auto">
                  <b className="text-white block mb-2">热门评论</b>
                  {hotComments.map(c => (
                    <div key={c.commentId} className="flex gap-2.5 py-2 border-b border-white/5">
                      <img src={c.user?.avatarUrl} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                      <div className="min-w-0">
                        <div className="text-xs text-np-sub">{c.user?.nickname} <span className="text-np-red ml-2">♥ {c.likedCount}</span></div>
                        <div className="text-sm text-[#d8d8dc] leading-relaxed">{c.content}</div>
                      </div>
                    </div>
                  ))}
                  <b className="text-white block mt-4 mb-2">最新评论</b>
                  {comments.map(c => (
                    <div key={c.commentId} className="flex gap-2.5 py-2 border-b border-white/5">
                      <img src={c.user?.avatarUrl} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                      <div className="min-w-0">
                        <div className="text-xs text-np-sub">{c.user?.nickname} <span className="text-np-red ml-2">♥ {c.likedCount}</span></div>
                        <div className="text-sm text-[#d8d8dc] leading-relaxed">{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'lyrics', label: '歌词',
              children: (
                <div ref={lyricBoxRef} className="h-[70vh] overflow-y-auto text-center py-6" style={{ scrollbarWidth: 'thin' }}>
                  {player.lyrics.length ? player.lyrics.map((l, i) => (
                    <p key={i} onClick={() => player.seekPlay(l.time)}
                       className={`leading-9 cursor-pointer transition-all ${i === activeLyric ? 'text-white font-bold text-base' : 'text-np-sub'}`}>
                      {l.text || '♪'}
                    </p>
                  )) : <p className="text-np-sub">纯音乐 / 暂无歌词</p>}
                </div>
              ),
            },
            {
              key: 'queue', label: `播放列表(${player.list.length})`,
              children: (
                <div className="h-[70vh] overflow-y-auto">
                  {player.list.map((q, i) => (
                    <div key={q.id + '-' + i}
                         className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg ${q.id === player.current?.id ? 'bg-netease-red/10' : 'hover:bg-white/5'}`}
                         onClick={() => player.playIndex(i)}>
                      <span className="w-6 font-serif text-np-sub">{i + 1}</span>
                      <img src={q.cover} className="w-9 h-9 rounded object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${q.id === player.current?.id ? 'text-netease-red font-bold' : 'text-white'}`}>{q.name}</div>
                        <div className="text-xs text-np-sub truncate">{q.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
