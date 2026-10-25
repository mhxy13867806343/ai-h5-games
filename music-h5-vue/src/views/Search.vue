<template>
  <div class="page">
    <van-search v-model="kw2" placeholder="搜索歌曲 / 歌手 / 歌单" show-action
      @search="doSearch" background="transparent">
      <template #action>
        <span class="search-btn" @click="doSearch">搜索</span>
      </template>
    </van-search>
    <div v-if="!searched" class="hot-zone">
      <div v-if="defaultKw && !kw" class="section-title" style="margin-left:12px;margin-top:10px">
        <span style="cursor:pointer" @click="kw2 = defaultKw; doSearch()">💡 猜你想搜：{{ defaultKw }}</span>
      </div>
      <div v-if="suggests.length" style="display:flex;flex-wrap:wrap;gap:8px;padding:0 12px">
        <span v-for="sg in suggests" :key="sg" class="hot-tag" @click="kw2 = sg; doSearch()">{{ sg }}</span>
      </div>
      <div class="section-title" style="margin-left:12px">热搜</div>
      <div class="hot-tags">
        <span v-for="h in hots" :key="h.first" class="hot-tag" @click="kw = h.first; doSearch()">{{ h.first }}</span>
      </div>
      <div v-if="history.length" class="section-title" style="margin-left:12px">搜索历史</div>
      <div class="hot-tags">
        <span v-for="h in history" :key="h" class="hot-tag dim" @click="kw = h; doSearch()">{{ h }}</span>
      </div>
    </div>
    <van-cell-group v-else inset :border="false">
      <van-cell v-for="(s, i) in results" :key="s.id" :border="false" @click="play(i)">
        <template #title><span class="song-name">{{ s.name }}</span></template>
        <template #label>{{ songArtists(s) }} · {{ s.album?.name || s.al?.name }}</template>
        <template #right-icon><span class="play-btn">▶</span></template>
      </van-cell>
      <van-empty v-if="!results.length && !loading" description="没有找到相关歌曲" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, api2, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayerStore } from '../stores/player';

const kw = ref('');
const hots = ref<{ first: string }[]>([]);
const results = ref<Song[]>([]);
const searched = ref(false);
const loading = ref(false);
const history = ref<string[]>(JSON.parse(localStorage.getItem('music_history') || '[]'));
const defaultKw = ref('');
const hotDetail = ref<{ searchWord: string }[]>([]);
const suggests = ref<string[]>([]);
let suggestTimer: ReturnType<typeof setTimeout> | undefined;
const player = usePlayerStore();
const router = useRouter();

async function doSearch() {
  if (!kw.value.trim()) return;
  loading.value = true;
  searched.value = true;
  history.value = [kw.value, ...history.value.filter(h => h !== kw.value)].slice(0, 12);
  localStorage.setItem('music_history', JSON.stringify(history.value));
  try {
    const r = await api.search(kw.value.trim());
    results.value = r.result.songs || [];
  } finally { loading.value = false; }
}
function play(i: number) {
  player.playList(results.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), i);
  router.push('/player');
}
onMounted(async () => {
  try { hots.value = (await api.searchHot()).result.hots.slice(0, 12); } catch { /* ignore */ }
  api2.searchDefault().then(r => { defaultKw.value = r.data?.realkeyword || r.data?.showKeyword || ''; }).catch(() => {});
  api2.searchHotDetail().then(r => { hotDetail.value = (r.data || []).slice(0, 10); }).catch(() => {});
});
const kw2 = computed({
  get: () => kw.value,
  set: (v: string) => { kw.value = v; clearTimeout(suggestTimer); suggestTimer = setTimeout(() => {
    if (v.trim().length > 1) api2.searchSuggest(v.trim()).then(r => {
      suggests.value = ['songs', 'artists', 'playlists'].flatMap(k => ((r.result as any)?.[k] || []).map((x: any) => x.name)).slice(0, 8);
    }).catch(() => {});
    else suggests.value = [];
  }, 250); },
});
</script>

<style scoped>
.search-btn { color: #ff3a3a; }
.hot-zone { padding: 0 12px; }
.hot-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.hot-tag { padding: 6px 14px; background: #2a2a2e; border-radius: 16px; font-size: 13px; }
.hot-tag.dim { color: #8e8e93; }
.song-name { color: #f5f5f7; }
.play-btn { color: #ff3a3a; }
:deep(.van-cell) { background: transparent; }
:deep(.van-search__content) { background: #2a2a2e; }
</style>
