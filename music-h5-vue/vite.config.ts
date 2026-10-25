import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [vue(), UnoCSS()],
  build: { rollupOptions: { input: { main: 'template.html' } } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
