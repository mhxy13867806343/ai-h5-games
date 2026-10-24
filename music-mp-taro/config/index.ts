import { defineConfig } from '@tarojs/cli';
import devConfig from './dev';
import prodConfig from './prod';

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'music-mp-taro',
    date: '2026-10-25',
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    framework: 'react',
    compiler: 'webpack5',
    mini: { postcss: { cssModules: { enable: false } } },
    h5: {},
  };
  if (process.env.NODE_ENV === 'development') return merge({}, baseConfig, devConfig);
  return merge({}, baseConfig, prodConfig);
});
