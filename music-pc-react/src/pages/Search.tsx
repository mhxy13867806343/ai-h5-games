import { useEffect, useState } from 'react';
import { Input, Table, Tag, Typography } from 'antd';
import { api, api2, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

export default function Search() {
  const player = usePlayer();
  const [kw, setKw] = useState('');
  const [hots, setHots] = useState<{ first: string }[]>([]);
  const [results, setResults] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('pc_music_history') || '[]'));
  const [defaultKw, setDefaultKw] = useState('');
  const [hotDetail, setHotDetail] = useState<any[]>([]);
  const [suggests, setSuggests] = useState<string[]>([]);

  useEffect(() => {
    api.searchHot().then(r => setHots((r?.result?.hots || []).slice(0, 14))).catch(() => {});
    api2.searchDefault().then(r => setDefaultKw(r.data?.realkeyword || r.data?.showKeyword || '')).catch(() => {});
    api2.searchHotDetail().then(r => setHotDetail((r.data || []).slice(0, 10))).catch(() => {});
  }, []);

  useEffect(() => {
    if (kw.trim().length <= 1) { setSuggests([]); return; }
    const t = setTimeout(() => {
      api2.searchSuggest(kw.trim()).then(r => {
        setSuggests(['songs', 'artists', 'playlists'].flatMap(k => ((r.result as any)?.[k] || []).map((x: any) => x.name)).slice(0, 8));
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [kw]);

  const doSearch = async (k?: string) => {
    const word = (k ?? kw).trim();
    if (!word) return;
    setKw(word); setSearched(true);
    const h = [word, ...history.filter(x => x !== word)].slice(0, 12);
    setHistory(h);
    localStorage.setItem('pc_music_history', JSON.stringify(h));
    try { const r = await api.search(word); setResults(r.result.songs || []); } catch { setResults([]); }
  };

  return (
    <div>
      <Input.Search
        size="large" placeholder="搜索歌曲 / 歌手 / 专辑" enterButton="搜索"
        value={kw} onChange={e => setKw(e.target.value)} onSearch={v => doSearch(v)}
        style={{ maxWidth: 560, marginBottom: 20 }}
      />
      {!searched && (
        <div>
          {defaultKw && !kw && (
            <div className="text-sm text-np-sub mb-4 cursor-pointer" onClick={() => doSearch(defaultKw)}>
              💡 猜你想搜：<span className="text-white">{defaultKw}</span>
            </div>
          )}
          {suggests.length > 0 && (
            <>
              <b className="text-white block mb-2">搜索建议</b>
              <div className="flex flex-wrap gap-2 mb-4">
                {suggests.map(sg => <Tag key={sg} color="red" style={{ cursor: 'pointer' }} onClick={() => doSearch(sg)}>{sg}</Tag>)}
              </div>
            </>
          )}
          <Typography.Title level={5} style={{ color: '#f5f5f7' }}>热搜</Typography.Title>
          <div className="flex flex-wrap gap-2">
            {hots.map(h => <Tag key={h.first} color="red" onClick={() => doSearch(h.first)} style={{ cursor: 'pointer' }}>{h.first}</Tag>)}
          </div>
          {hotDetail.length > 0 && (
            <>
              <Typography.Title level={5} style={{ color: '#f5f5f7', marginTop: 20 }}>热搜榜</Typography.Title>
              <div className="flex flex-col gap-1 max-w-md">
                {hotDetail.map((h, i) => (
                  <div key={h.searchWord} className="flex items-center gap-3 cursor-pointer py-1" onClick={() => doSearch(h.searchWord)}>
                    <b className="font-serif w-6" style={{ color: i < 3 ? '#e8464f' : '#8e8e93' }}>{i + 1}</b>
                    <span className="text-sm text-white">{h.searchWord}</span>
                    <span className="text-xs text-np-sub">{h.score}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {history.length > 0 && (
            <>
              <Typography.Title level={5} style={{ color: '#f5f5f7', marginTop: 20 }}>搜索历史（最多 12 条）</Typography.Title>
              <div className="flex flex-wrap gap-2">
                {history.map(h => <Tag key={h} style={{ cursor: 'pointer' }} onClick={() => doSearch(h)}>{h}</Tag>)}
              </div>
            </>
          )}
        </div>
      )}
      {searched && (
        <Table rowKey="id" dataSource={results} size="small" pagination={{ pageSize: 15 }}
          onRow={(r, i) => ({ onClick: () => { if (i != null) player.playList(results.map(s => ({
            id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
          })), i); } , style: { cursor: 'pointer' } })}
          columns={[
            { title: '#', width: 60, render: (_: any, __: any, i: number) => i + 1 },
            { title: '歌曲', dataIndex: 'name', render: (v: string) => <b className="text-white">{v}</b> },
            { title: '歌手', key: 'ar', render: (_: any, r: Song) => songArtists(r) },
            { title: '专辑', key: 'al', render: (_: any, r: Song) => r.al?.name || r.album?.name || '-', ellipsis: true },
            { title: '时长', key: 'dt', width: 90, render: (_: any, r: Song) => dayjs.duration(songDuration(r)).format('mm:ss') },
          ]}
        />
      )}
    </div>
  );
}
