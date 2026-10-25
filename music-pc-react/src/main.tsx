import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import 'virtual:uno.css';
import './styles/global.css';

// 音频解锁（部分浏览器需要用户手势后才能播）
window.addEventListener('pointerdown', () => {
  try {
    const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    a.volume = 0;
    a.play().then(() => a.pause()).catch(() => {});
  } catch { /* ignore */ }
}, { once: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#e8464f' } }}>
      <HashRouter>
        <App />
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
