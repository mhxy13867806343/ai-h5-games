<template>
  <div class="page">
    <van-nav-bar title="推荐" />
    <div class="sec-t">推荐歌单</div>
    <div class="pl-scroll">
      <div v-for="p in recoPlaylists" :key="p.id" class="pl-card" @click="$router.push(`/playlist/${p.id}`)">
        <img :src="p.picUrl" class="pl-img" loading="lazy" alt="" />
        <span class="pl-name">{{ p.name }}</span>
      </div>
    </div>
    <div class="sec-t">推荐新音乐</div>
    <van-cell-group inset :border="false">
      <van-cell v-for="s in newsongs" :key="s.id" :border="false" @click="playNewsong(s)">
        <template #title><span class="song-name">{{ s.name }}</span></template>
        <template #label>{{ songArtistStr(s) }}</template>
        <template #right-icon><span class="play-btn">▶</span></template>
      </van-cell>
    </van-cell-group>
    <div class="sec-t">推荐电台</div>
    <div class="dj-scroll">
      <div v-for="d in djRadios" :key="d.id" class="dj-card">
        <img :src="d.picUrl" class="dj-img" loading="lazy" alt="" />
        <span class="pl-name">{{ d.name }}</span>
      </div>
    </div>
    <div class="sec-t">独家放送</div>
    <div class="ex-grid">
      <div v-for="e in exclusives" :key="e.id" class="ex-card">
        <img :src="e.picUrl || e.cover" class="ex-img" loading="lazy" alt="" />
        <span class="pl-name">{{ e.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api2, type Song } from '../api';
import { usePlayerStore } from '../stores/player';

const player = usePlayerStore();
const recoPlaylists = ref<any[]>([]);
const newsongs = ref<any[]>([]);
const djRadios = ref<any[]>([]);
const exclusives = ref<any[]>([]);

const songArtistStr = (s: any) => {
  const ar = s.song?.artists || s.artists || [];
  return ar.map((a: any) => a.name).join('/');
};
function playNewsong(s: any) {
  const song: Song = {
    id: s.id, name: s.name,
    artist: songArtistStr(s),
    cover: s.song?.album?.picUrl || s.picUrl || '',
    duration: (s.song?.duration || 0) / 1000,
  };
  player.playSong(song);
}

onMounted(async () => {
  const [p, n, d, e] = await Promise.allSettled([
    api2.personalized(12), api2.personalizedNewsong(12), api2.djRecommend(), api2.privateContent(),
  ]);
  if (p.status === 'fulfilled') recoPlaylists.value = p.value.result || [];
  if (n.status === 'fulfilled') newsongs.value = n.value.result || [];
  if (d.status === 'fulfilled') djRadios.value = (d.value.djRadios || []).slice(0, 10);
  if (e.status === 'fulfilled') exclusives.value = e.value.result || [];
});
</script>

<style scoped>
.sec-t { font-size: 16px; font-weight: 700; margin: 18px 12px 10px; }
.pl-scroll, .dj-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 2px 12px; }
.pl-card, .dj-card { width: 108px; flex-shrink: 0; }
.pl-img, .dj-img { width: 108px; height: 108px; border-radius: 12px; object-fit: cover; background: #2a2a2e; }
.pl-name { font-size: 12px; display: block; margin-top: 6px; line-height: 1.4; height: 2.8em; overflow: hidden; }
.song-name { color: #f5f5f7; }
.play-btn { color: #ff3a3a; }
.ex-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 2px 12px; }
.ex-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 10px; background: #2a2a2e; }
:deep(.van-cell) { background: transparent; }
</style>
