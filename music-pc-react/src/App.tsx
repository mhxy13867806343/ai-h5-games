import { Suspense, lazy } from 'react';
import { useRoutes } from 'react-router-dom';
import { Layout, Menu, Spin } from 'antd';
import { HomeFilled, FireFilled, SearchOutlined, AudioOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import PlayerBar from './components/PlayerBar';
import 'dayjs/locale/zh-cn';

const Home = lazy(() => import('./pages/Home'));
const Rank = lazy(() => import('./pages/Rank'));
const Search = lazy(() => import('./pages/Search'));
const Playlist = lazy(() => import('./pages/Playlist'));

const items = [
  { key: '/', icon: <HomeFilled />, label: '发现音乐' },
  { key: '/rank', icon: <FireFilled />, label: '排行榜' },
  { key: '/search', icon: <SearchOutlined />, label: '搜索音乐' },
];

export default function App() {
  const nav = useNavigate();
  const loc = useLocation();
  const element = useRoutes([
    { path: '/', element: <Home /> },
    { path: '/rank', element: <Rank /> },
    { path: '/search', element: <Search /> },
    { path: '/playlist/:id', element: <Playlist /> },
    { path: '*', element: <Home /> },
  ]);
  return (
    <Layout className="min-h-screen" style={{ background: '#101014' }}>
      <Layout.Sider width={208} style={{ background: '#141419', borderRight: '1px solid #23232b' }}>
        <div className="flex items-center gap-2 px-5 py-5">
          <AudioOutlined style={{ color: '#e8464f', fontSize: 22 }} />
          <b className="text-white text-lg tracking-wide">云音乐 · PC</b>
          <span className="text-[10px] text-np-sub mt-1">React</span>
        </div>
        <Menu
          mode="inline" items={items} selectedKeys={[loc.pathname]}
          onClick={e => nav(e.key)} style={{ background: 'transparent', borderInlineEnd: 'none' }}
        />
        <div className="absolute bottom-4 left-5 text-[11px] text-np-sub">免登录接口 · musicapi.cn</div>
      </Layout.Sider>
      <Layout.Content style={{ background: '#101014' }}>
        <div className="p-6 pb-28">
          <Suspense fallback={<div className="grid place-items-center h-96"><Spin size="large" /></div>}>
            {element}
          </Suspense>
        </div>
      </Layout.Content>
      <PlayerBar />
    </Layout>
  );
}
