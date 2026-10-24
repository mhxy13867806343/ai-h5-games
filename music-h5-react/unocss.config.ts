import { defineConfig, presetUno, presetAttributify } from 'unocss';

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  theme: {
    colors: { netease: { bg: '#1c1c1e', card: '#2a2a2e', red: '#ff3a3a', sub: '#8e8e93' } },
  },
});
