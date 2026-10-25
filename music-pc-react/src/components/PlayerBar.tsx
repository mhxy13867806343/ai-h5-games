import { Slider, Tooltip } from 'antd';
import { PlayCircleFilled, PauseCircleFilled, StepBackwardFilled, StepForwardFilled } from '@ant-design/icons';
import { usePlayer } from '../hooks/usePlayer';
import { useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');

export default function PlayerBar() {
  const player = usePlayer();
  const [seek, setSeek] = useState<number | null>(null);
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
      <span className="text-xs text-np-sub w-10 text-right">{fmt(cur)}</span>
      <Slider className="flex-1" min={0} max={max || 100}
              value={cur} onChange={(v: number) => setSeek(v)}
              onChangeComplete={(v: number) => { player.seek(v as number); setSeek(null); }}
              tooltip={{ open: false }} />
      <span className="text-xs text-np-sub w-10">{fmt(max)}</span>
      {player.unavailable && <span className="text-xs text-yellow-500">该歌曲暂无版权</span>}
    </div>
  );
}
