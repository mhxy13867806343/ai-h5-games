<template>
  <div class="page player-page" v-if="player.current">
    <div class="cover-wrap" :class="{ spinning: player.playing }">
      <img :src="player.current.cover" class="cover" referrerpolicy="no-referrer" />
    </div>
    <div class="song-title">{{ player.current.name }}</div>
    <div class="song-artist">{{ player.current.artist }}</div>

    <div class="lyrics" ref="lyricBox">
      <p v-for="(l, i) in player.lyrics" :key="i" :class="{ on: i === activeLyric }" :ref="el => setLyricRef(el as HTMLElement, i)">{{ l.text || '♪' }}</p>
      <p v-if="!player.lyrics.length" class="on">纯音乐 / 暂无歌词</p>
    </div>

    <van-notice-bar v-if="player.unavailable" text="该歌曲暂无版权或需 VIP，已跳过播放（可点下一首）" color="#ff9f0a" background="#2a2a2e" />
    <van-loading v-if="player.loadingUrl" size="20" class="load">获取播放地址…</van-loading>

    <div class="progress">
      <span>{{ fmt(player.currentTime) }}</span>
      <van-slider v-model="progress" :max="player.duration || 1" @change="player.seek(progress)" button-size="14" active-color="#ff3a3a" />
      <span>{{ fmt(player.duration || player.current.duration) }}</span>
    </div>

    <div class="controls">
      <span class="ctrl" @click="player.prev()">⏮</span>
      <span class="ctrl main" @click="player.toggle()">{{ player.playing ? '⏸' : '▶' }}</span>
      <span class="ctrl" @click="player.next()">⏭</span>
    </div>
  </div>
  <div v-else class="page" style="display:grid;place-items:center">
    <van-empty description="还没有播放的歌曲，去首页挑一首吧" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const player = usePlayerStore();
const progress = ref(0);
const lyricBox = ref<HTMLElement>();
const lyricEls: HTMLElement[] = [];

const setLyricRef = (el: HTMLElement | null, i: number) => { if (el) lyricEls[i] = el; };
const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');

const activeLyric = computed(() => {
  const t = player.currentTime;
  let idx = -1;
  player.lyrics.forEach((l, i) => { if (l.time <= t + 0.3) idx = i; });
  return idx;
});

watch(() => player.currentTime, t => {
  progress.value = t;
  const idx = activeLyric.value;
  if (idx >= 0 && lyricEls[idx] && lyricBox.value) {
    const el = lyricEls[idx];
    const box = lyricBox.value;
    const target = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }
});

onMounted(() => nextTick());
onBeforeUnmount(() => { lyricEls.length = 0; });
</script>

<style scoped>
.player-page { padding: 26px 22px 60px; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.cover-wrap { width: 230px; height: 230px; border-radius: 50%; overflow: hidden; border: 8px solid #101012; box-shadow: 0 0 40px rgba(255,58,58,.2); animation: spin 24s linear infinite; animation-play-state: paused; }
.cover-wrap.spinning { animation-play-state: running; }
@keyframes spin { to { transform: rotate(360deg); } }
.cover { width: 100%; height: 100%; object-fit: cover; }
.song-title { font-size: 19px; font-weight: 800; margin-top: 20px; text-align: center; }
.song-artist { font-size: 13px; color: #8e8e93; margin-top: 6px; }
.lyrics { height: 180px; width: 100%; overflow-y: auto; margin-top: 18px; text-align: center; scrollbar-width: none; }
.lyrics::-webkit-scrollbar { display: none; }
.lyrics p { font-size: 14px; color: #6b6b70; line-height: 2; transition: all .3s; }
.lyrics p.on { color: #f5f5f7; font-size: 15px; font-weight: 700; }
.progress { display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 20px; font-size: 11px; color: #8e8e93; }
.progress .van-slider { flex: 1; }
.controls { display: flex; align-items: center; gap: 44px; margin-top: 26px; }
.ctrl { font-size: 30px; }
.ctrl.main { width: 66px; height: 66px; border-radius: 50%; background: #ff3a3a; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 26px rgba(255,58,58,.4); }
.load { margin-top: 10px; }
</style>
