import { Suspense, lazy, useEffect } from 'react';
import { useRoutes, Navigate } from 'react-router-dom';
import { TabBar, Toast } from 'antd-mobile';
import { usePlayer } from './hooks/usePlayer';
import MiniPlayer from './components/MiniPlayer';

const Home = lazy(() => import('./pages/Home'));
const Rank = lazy(() => import('./pages/Rank'));
const Search = lazy(() => import('./pages/Search'));
const Playlist = lazy(() => import('./pages/Playlist'));
const Player = lazy(() => import('./pages/Player'));

const tabs = [
  { key: '/', title: '首页', icon: '🎵' },
  { key: '/rank', title: '排行榜', icon: '🏆' },
  { key: '/search', title: '搜索', icon: '🔍' },
];

export default function App() {
  // PC 端打开 H5 应用时 Toast 提示
  useEffect(() => {
    const isPC = window.innerWidth > 750 && !/Mobi|Android|iPhone|iPad|Harmony/i.test(navigator.userAgent);
    if (isPC) {
      Toast.show({ content: '📱 这是 H5 移动端应用，建议用手机打开体验更佳', duration: 3200 });
    }
  }, []);
  const element = useRoutes([
    { path: '/', element: <Home /> },
    { path: '/rank', element: <Rank /> },
    { path: '/search', element: <Search /> },
    { path: '/playlist/:id', element: <Playlist /> },
    { path: '/player', element: <Player /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
  const player = usePlayer();
  return (
    <div className="app-shell min-h-screen bg-netease-bg text-white">
      <Suspense fallback={<div className="p-10 text-center text-netease-sub">加载中…</div>}>
        {element}
      </Suspense>
      {player.current && <MiniPlayer />}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <TabBar activeKey={location.hash.replace('#', '').split('?')[0] || '/'} onChange={k => { location.hash = k; }}>
          {tabs.map(t => (
            <TabBar.Item key={t.key} icon={<span className="text-lg">{t.icon}</span>} title={t.title} />
          ))}
        </TabBar>
      </div>
    </div>
  );
}
