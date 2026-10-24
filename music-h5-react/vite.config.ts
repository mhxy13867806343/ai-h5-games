import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  base: '/ai-h5-games/music-h5-react/',
  plugins: [react(), UnoCSS()],
  resolve: { alias: { '@': '/src' } },
});
