<template>
  <div class="page">
    <van-nav-bar title="歌单" left-arrow @click-left="$router.back()" />
    <div v-if="pl" class="pl-head">
      <img :src="pl.coverImgUrl" class="pl-head-cover" />
      <div class="pl-head-info">
        <div class="pl-title">{{ pl.name }}</div>
        <div class="pl-meta">{{ pl.trackCount || tracks.length }} 首</div>
        <div class="pl-desc" v-if="pl.description">{{ pl.description.slice(0, 60) }}…</div>
      </div>
    </div>
    <van-cell-group inset :border="false">
      <van-cell v-for="(s, i) in tracks" :key="s.id" :border="false" is-link @click="play(i)">
        <template #title>
          <span class="song-idx">{{ i + 1 }}</span>
          <span class="song-name">{{ s.name }}</span>
        </template>
        <template #label>{{ songArtists(s) }} · {{ fmtTime(songDuration(s)) }}</template>
      </van-cell>
    </van-cell-group>
    <van-loading v-if="loading" class="load" vertical>加载中…</van-loading>
    <van-empty v-else-if="!tracks.length" description="曲目暂不可用（接口限流或歌单过新），试试排行榜的歌单" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, songArtists, songDuration, songCover, type Song, type Playlist } from '../api';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const pl = ref<Playlist | null>(null);
const tracks = ref<Song[]>([]);
const loading = ref(true);
const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

function play(i: number) {
  player.playList(tracks.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), i);
  router.push('/player');
}

onMounted(async () => {
  const id = Number(route.params.id);
  const [d, t] = await Promise.allSettled([api.playlistDetail(id), api.playlistTracks(id, 60)]);
  if (d.status === 'fulfilled') pl.value = d.value.playlist;
  if (t.status === 'fulfilled') tracks.value = t.value.songs;
  loading.value = false;
});
</script>

<style scoped>
.pl-head { display: flex; gap: 14px; padding: 16px; }
.pl-head-cover { width: 110px; height: 110px; border-radius: 14px; object-fit: cover; background: #2a2a2e; }
.pl-title { font-size: 16px; font-weight: 700; }
.pl-meta { font-size: 12px; color: #8e8e93; margin: 6px 0; }
.pl-desc { font-size: 11px; color: #8e8e93; line-height: 1.5; }
.song-idx { display: inline-block; width: 24px; color: #8e8e93; font-family: Georgia, serif; }
.song-name { color: #f5f5f7; }
.load { margin: 30px auto; }
:deep(.van-cell) { background: transparent; }
</style>
