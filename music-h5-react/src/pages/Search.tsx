import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'antd-mobile';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';

export default function Search() {
  const nav = useNavigate();
  const player = usePlayer();
  const [kw, setKw] = useState('');
  const [hots, setHots] = useState<{ first: string }[]>([]);
  const [results, setResults] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('react_music_history') || '[]'));

  useEffect(() => {
    api.searchHot().then(r => setHots(r.result.hots.slice(0, 12))).catch(() => {});
  }, []);

  const doSearch = async (keyword?: string) => {
    const k = (keyword ?? kw).trim();
    if (!k) return;
    setKw(k);
    setSearched(true);
    const h = [k, ...history.filter(x => x !== k)].slice(0, 8);
    setHistory(h);
    localStorage.setItem('react_music_history', JSON.stringify(h));
    try {
      const r = await api.search(k);
      setResults(r.result.songs || []);
    } catch { setResults([]); }
  };

  const play = (i: number) => {
    player.playList(results.map(s => ({
      id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
    })), i);
    nav('/player');
  };

  return (
    <div className="page-pad">
      <div className="px-4 pt-3 flex gap-2.5">
        <input value={kw} onChange={e => setKw(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
               placeholder="搜索歌曲 / 歌手 / 歌单"
               className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none bg-netease-card text-white placeholder:text-netease-sub" />
        <button className="text-netease-red text-sm font-bold px-2" onClick={() => doSearch()}>搜索</button>
      </div>
      {!searched ? (
        <div className="px-4">
          <div className="text-[15px] font-bold mt-4 mb-3">热搜</div>
          <div className="flex flex-wrap gap-2.5">
            {hots.map(h => (
              <span key={h.first} className="px-3.5 py-1.5 rounded-full text-[13px] bg-netease-card"
                    onClick={() => doSearch(h.first)}>{h.first}</span>
            ))}
          </div>
          {history.length > 0 && <div className="text-[15px] font-bold mt-5 mb-3">搜索历史</div>}
          <div className="flex flex-wrap gap-2.5">
            {history.map(h => (
              <Tag key={h} onClick={() => doSearch(h)} style={{ '--border-radius': '999px' } as any}>{h}</Tag>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-3">
          {results.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 py-2.5 border-b border-white/5" onClick={() => play(i)}>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{s.name}</div>
                <div className="text-xs text-netease-sub truncate">{songArtists(s)} · {s.album?.name || s.al?.name}</div>
              </div>
              <span className="text-netease-red">▶</span>
            </div>
          ))}
          {results.length === 0 && <div className="text-center py-10 text-netease-sub">没有找到相关歌曲</div>}
        </div>
      )}
    </div>
  );
}
