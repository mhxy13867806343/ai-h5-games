export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/rank/rank',
    'pages/search/search',
    'pages/playlist/playlist',
    'pages/player/player',
  ],
  tabBar: {
    color: '#8e8e93',
    selectedColor: '#ff3a3a',
    backgroundColor: '#101012',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/rank/rank', text: '排行榜' },
      { pagePath: 'pages/search/search', text: '搜索' },
    ],
  },
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#1c1c1e',
    navigationBarTextStyle: 'white',
    navigationBarTitleText: '云音乐 Taro',
    backgroundColor: '#1c1c1e',
  },
});
