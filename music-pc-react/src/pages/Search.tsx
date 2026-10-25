import { useEffect, useState } from 'react';
import { Input, Table, Tag } from 'antd';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
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

  useEffect(() => { api.searchHot().then(r => setHots((r?.result?.hots || []).slice(0, 14))); }, []);

  const doSearch = async (k?: string) => {
    const word = (k ?? kw).trim();
    if (!word) return;
    setKw(word); setSearched(true);
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
        <div className="mb-6">
          <b className="text-white">热搜</b>
          <div className="flex flex-wrap gap-2 mt-3">
            {hots.map(h => <Tag key={h.first} color="red" onClick={() => doSearch(h.first)} style={{ cursor: 'pointer' }}>{h.first}</Tag>)}
          </div>
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
