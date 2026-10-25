<template>
  <div class="page">
    <van-nav-bar title="歌手" left-arrow @click-left="$router.back()" />
    <div v-if="info" class="head">
      <img :src="info.cover" class="head-img" alt="" />
      <div>
        <div class="head-name">{{ info.name }}</div>
        <div class="head-sub">专辑 {{ info.albumSize }} · MV {{ info.mvSize }} · 歌曲 {{ info.musicSize }}</div>
      </div>
    </div>
    <van-tabs v-model:active="tab" sticky>
      <van-tab title="热门50">
        <van-cell-group inset :border="false">
          <van-cell v-for="(s, i) in topSongs" :key="s.id" :border="false" @click="playTop(i)">
            <template #title><span class="song-idx" :class="{ hot: i < 3 }">{{ i + 1 }}</span><span class="song-name">{{ s.name }}</span></template>
            <template #label>{{ songArtists(s) }} · {{ fmtTime(songDuration(s)) }}</template>
          </van-cell>
        </van-cell-group>
      </van-tab>
      <van-tab title="全部歌曲">
        <van-cell-group inset :border="false">
          <van-cell v-for="(s, i) in allSongs" :key="s.id" :border="false" @click="playAll(i)">
            <template #title><span class="song-idx">{{ i + 1 }}</span><span class="song-name">{{ s.name }}</span></template>
            <template #label>{{ songArtists(s) }} · {{ fmtTime(songDuration(s)) }}</template>
          </van-cell>
        </van-cell-group>
      </van-tab>
      <van-tab title="专辑">
        <div class="alb-grid">
          <div v-for="a in albums" :key="a.id" class="alb-cell">
            <img :src="a.picUrl" class="alb-img" loading="lazy" alt="" />
            <span class="alb-name">{{ a.name }}</span>
          </div>
        </div>
      </van-tab>
      <van-tab title="MV">
        <div class="alb-grid">
          <a v-for="m in mvs" :key="m.id" class="alb-cell" :href="mvWebUrl(m.id)" target="_blank" rel="noopener">
            <img :src="m.cover" class="alb-img" loading="lazy" alt="" />
            <span class="alb-name">{{ m.name }}</span>
          </a>
        </div>
      </van-tab>
      <van-tab title="简介">
        <div class="desc">
          <p v-for="(d, i) in descs" :key="i"><b v-if="d.t">{{ d.t }}</b>{{ d.txt }}</p>
        </div>
      </van-tab>
    </van-tabs>
    <van-loading v-if="loading" class="load" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, api2, songArtists, songDuration, songCover, mvWebUrl, type Song } from '../api';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const id = Number(route.params.id);
const info = ref<any>(null);
const topSongs = ref<Song[]>([]);
const allSongs = ref<Song[]>([]);
const albums = ref<any[]>([]);
const mvs = ref<any[]>([]);
const descs = ref<{ t?: string; txt: string }[]>([]);
const tab = ref(0);
const loading = ref(true);
const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

function playTop(i: number) {
  player.playList(topSongs.value.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })), i);
  router.push('/player');
}
function playAll(i: number) {
  player.playList(allSongs.value.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })), i);
  router.push('/player');
}

onMounted(async () => {
  const [d, top, ab, de] = await Promise.allSettled([
    api2.artistDetail(id), api2.artistTopSong(id), api2.artistAlbum(id, 24), api2.artistDesc(id),
  ]);
  if (d.status === 'fulfilled') info.value = d.value.data?.artist;
  if (top.status === 'fulfilled') topSongs.value = top.value.songs || [];
  if (ab.status === 'fulfilled') albums.value = ab.value.hotAlbums || [];
  if (de.status === 'fulfilled') descs.value = (de.value.introduction || []).map((x: any) => ({ t: x.ti, txt: x.txt }));
  loading.value = false;
  // 全部歌曲与 MV 懒加载
  api2.artistMv(id).then(r => mvs.value = r.mvs || []).catch(() => {});
  api.artistSongs(id, 50).then(r => allSongs.value = r.songs || []).catch(() => {});
});
</script>

<style scoped>
.head { display: flex; gap: 16px; padding: 16px; }
.head-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; background: #2a2a2e; }
.head-name { font-size: 19px; font-weight: 800; }
.head-sub { font-size: 12px; color: #8e8e93; margin-top: 8px; }
.song-idx { display: inline-block; width: 24px; color: #8e8e93; font-family: Georgia, serif; }
.song-idx.hot { color: #ff3a3a; }
.song-name { color: #f5f5f7; }
.alb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px; }
.alb-cell { text-align: center; }
.alb-img { width: 100%; aspect-ratio: 1; border-radius: 10px; object-fit: cover; background: #2a2a2e; }
.alb-name { font-size: 11px; display: block; margin-top: 5px; line-height: 1.4; }
.desc { padding: 14px 18px; font-size: 13px; color: #a0a0a8; line-height: 1.8; white-space: pre-wrap; }
.desc b { display: block; color: #f5f5f7; margin: 10px 0 4px; }
.load { margin: 30px auto; }
:deep(.van-cell) { background: transparent; }
</style>
