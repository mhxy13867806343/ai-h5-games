<template>
  <div class="page">
    <van-nav-bar title="云音乐" left-text="🎧 Vue" />
    <van-swipe :autoplay="4000" indicator-color="#ff3a3a" class="banner">
      <van-swipe-item v-for="b in banners" :key="b.pic">
        <img :src="b.pic" class="banner-img" loading="lazy" />
      </van-swipe-item>
    </van-swipe>

    <div class="quick-row">
      <router-link to="/recommend" class="quick-btn">🔥 推荐</router-link>
      <router-link to="/playlist-cat" class="quick-btn">📂 歌单分类</router-link>
    </div>

    <div class="ball-row" v-if="dragonBalls.length">
      <div v-for="d in dragonBalls" :key="d.name" class="ball">
        <img :src="d.iconUrl" alt="" /><span>{{ d.name }}</span>
      </div>
    </div>

    <div class="section-title">热门歌单 <router-link to="/rank">更多榜单 →</router-link></div>
    <div class="pl-scroll">
      <div v-for="p in playlists" :key="p.id" class="pl-card" @click="$router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="pl-cover" loading="lazy" />
        <div class="pl-name">{{ p.name }}</div>
        <div class="pl-count">▶ {{ fmtCount(p.playCount) }}</div>
      </div>
    </div>

    <div class="section-title">新歌速递
      <span class="add-all" @click="addAllNews">＋ 添加全部</span>
    </div>
    <van-cell-group inset :border="false">
      <van-cell
        v-for="(s, i) in newSongs.slice(0, 10)" :key="s.id" :border="false"
        @click="playNewSong(s)">
        <template #title>
          <span class="song-idx" :class="{ hot: i < 3 }">{{ i + 1 }}</span>
          <span class="song-name">{{ s.name }}</span>
        </template>
        <template #label>
          <span>{{ songArtists(s) }} · {{ fmtTime(songDuration(s)) }}</span>
        </template>
        <template #right-icon><span class="play-btn">▶</span></template>
      </van-cell>
    </van-cell-group>

    <van-empty v-if="!loading && !newSongs.length" description="暂无数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, api2, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

defineOptions({ name: 'HomePage' });

const banners = ref<{ pic: string }[]>([]);
const dragonBalls = ref<{ iconUrl: string; name: string }[]>([]);
const playlists = ref<any[]>([]);
const newSongs = ref<Song[]>([]);
const loading = ref(true);
const player = usePlayerStore();

const fmtCount = (n?: number) => n == null ? '' : n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n);
const fmtTime = (ms: number) => dayjs.duration(ms).format('mm:ss');

async function addAllNews() {
  player.addList(newSongs.value.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })));
}
async function playNewSong(s: Song) {
  await player.playSong({
    id: s.id, name: s.name,
    artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  });
}

onMounted(async () => {
  const [b, p, n] = await Promise.allSettled([api.banner(), api.topPlaylist(12), api.newSongs()]);
  if (b.status === 'fulfilled') banners.value = b.value.banners.map((x: any) => ({ pic: x.pic || x.imageUrl || x.bigImageUrl || '' })).slice(0, 6);
  api2.dragonBall().then(r => dragonBalls.value = (r.data || []).slice(0, 5)).catch(() => {});
  if (p.status === 'fulfilled') playlists.value = p.value.playlists;
  if (n.status === 'fulfilled') newSongs.value = n.value.data;
  loading.value = false;
});
</script>

<style scoped>
.banner { margin: 12px; border-radius: 14px; overflow: hidden; }
.banner-img { width: 100%; height: 150px; object-fit: cover; display: block; }
.pl-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 4px 12px; }
.pl-card { width: 108px; flex-shrink: 0; }
.pl-cover { width: 108px; height: 108px; border-radius: 12px; object-fit: cover; background: #2a2a2e; }
.pl-name { font-size: 12px; margin-top: 6px; line-height: 1.4; height: 2.8em; overflow: hidden; }
.pl-count { font-size: 10px; color: #8e8e93; }
.song-idx { display: inline-block; width: 22px; color: #8e8e93; font-family: Georgia, serif; font-weight: 700; }
.song-idx.hot { color: #ff3a3a; }
.song-name { color: #f5f5f7; }
.play-btn { color: #ff3a3a; font-size: 16px; }
:deep(.van-cell) { background: transparent; }
:deep(.van-cell__title) { flex: 1; }

<style scoped>
.quick-row { display: flex; gap: 10px; padding: 0 12px; margin-bottom: 4px; }
.quick-btn { flex: 1; text-align: center; padding: 9px 0; background: #2a2a2e; border-radius: 10px; font-size: 12px; color: #f5f5f7; text-decoration: none; }
.ball-row { display: flex; gap: 14px; padding: 10px 14px 0; }
.ball { flex: 1; text-align: center; }
.ball img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: #2a2a2e; }
.ball span { font-size: 10px; color: #8e8e93; display: block; margin-top: 4px; }
</style>
