import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';

export default function MiniPlayer() {
  const player = usePlayer();
  const nav = useNavigate();
  if (!player.current) return null;
  return (
    <div className="fixed left-2.5 right-2.5 z-20 flex items-center gap-2.5 rounded-3xl px-3 py-2"
         style={{ bottom: 58, background: 'rgba(42,42,46,.96)', backdropFilter: 'blur(8px)' }}
         onClick={() => nav('/player')}>
      <img src={player.current.cover} alt=""
           className={`w-10 h-10 rounded-full object-cover ${player.playing ? 'animate-spin' : ''}`}
           style={{ animation: player.playing ? 'spin 12s linear infinite' : 'none' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] truncate">{player.current.name}</div>
        <div className="text-[10px] text-netease-sub truncate">{player.current.artist}</div>
      </div>
      <span className="text-xl text-netease-red px-1" onClick={e => { e.stopPropagation(); player.toggle(); }}>
        {player.playing ? '⏸' : '▶'}
      </span>
      <span className="text-xl text-netease-red px-1" onClick={e => { e.stopPropagation(); player.next(); }}>⏭</span>
    </div>
  );
}
