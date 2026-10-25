import { defineConfig, presetUno } from 'unocss';
export default defineConfig({
  presets: [presetUno()],
  theme: { colors: { np: { bg: '#101014', card: '#1a1a20', red: '#e8464f', sub: '#8e8e93' } } },
});
