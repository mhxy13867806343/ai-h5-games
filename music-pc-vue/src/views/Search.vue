<template>
  <div>
    <el-input v-model="kw" size="large" placeholder="搜索歌曲 / 歌手 / 专辑（输入时给出实时建议）" class="mb-3" style="max-width: 560px"
              @keyup.enter="doSearch()">
      <template #append><el-button @click="doSearch()">搜索</el-button></template>
    </el-input>

    <div v-if="!searched">
      <div v-if="defaultKw && !kw" class="mb-4 text-np-sub text-sm cursor-pointer" @click="doSearch(defaultKw)">
        💡 猜你想搜：<span class="text-white">{{ defaultKw }}</span>
      </div>

      <template v-if="suggests.length">
        <b class="text-white">搜索建议</b>
        <div class="flex flex-wrap gap-2 mt-2 mb-4">
          <el-tag v-for="sg in suggests" :key="sg" class="cursor-pointer" @click="doSearch(sg)">{{ sg }}</el-tag>
        </div>
      </template>

      <b class="text-white">热搜</b>
      <div class="flex flex-wrap gap-2 mt-2 mb-4">
        <el-tag v-for="h in hots" :key="h.first" type="danger" effect="plain" class="cursor-pointer" @click="doSearch(h.first)">
          {{ h.first }}
        </el-tag>
      </div>

      <b class="text-white block mb-2">热搜榜</b>
      <div class="flex flex-col gap-1 max-w-md">
        <div v-for="(h, i) in hotDetail" :key="h.searchWord" class="flex items-center gap-3 cursor-pointer py-1" @click="doSearch(h.searchWord)">
          <b class="font-serif" :style="{ color: i < 3 ? '#e8464f' : '#8e8e93', width: '22px' }">{{ i + 1 }}</b>
          <span class="text-sm text-white">{{ h.searchWord }}</span>
          <span class="text-xs text-np-sub">{{ h.score }}</span>
        </div>
      </div>

      <template v-if="history.length">
        <b class="text-white block mt-4 mb-2">搜索历史（最多 12 条）</b>
        <div class="flex flex-wrap gap-2">
          <el-tag v-for="h in history" :key="h" type="info" class="cursor-pointer" @click="doSearch(h)">{{ h }}</el-tag>
        </div>
      </template>
    </div>

    <el-table v-else :data="results" size="small" @row-click="(r: any) => play(r)" :row-style="{ cursor: 'pointer' }">
      <el-table-column label="#" width="60"><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
      <el-table-column label="歌曲"><template #default="{ row }"><b class="text-white">{{ row.name }}</b></template></el-table-column>
      <el-table-column label="歌手"><template #default="{ row }">{{ songArtists(row) }}</template></el-table-column>
      <el-table-column label="专辑" show-overflow-tooltip><template #default="{ row }">{{ albumName(row) }}</template></el-table-column>
      <el-table-column label="时长" width="90"><template #default="{ row }">{{ fmtTime(songDuration(row)) }}</template></el-table-column>
    </el-table>
    <el-empty v-if="searched && !results.length" description="没有找到相关歌曲" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { api, api2, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayerStore } from '../stores/player';
import { fmtTime } from '../utils/format';

const player = usePlayerStore();
const kw = ref('');
const hots = ref<{ first: string }[]>([]);
const results = ref<Song[]>([]);
const searched = ref(false);
const history = ref<string[]>(JSON.parse(localStorage.getItem('pcvue_music_history') || '[]'));
const defaultKw = ref('');
const hotDetail = ref<any[]>([]);
const suggests = ref<string[]>([]);

const albumName = (r: Song) => r.al?.name || r.album?.name || '-';

onMounted(async () => {
  try { hots.value = (await api.searchHot())?.result?.hots.slice(0, 14) || []; } catch { /* ignore */ }
  api2.searchDefault().then(r => { defaultKw.value = r.data?.realkeyword || r.data?.showKeyword || ''; }).catch(() => {});
  api2.searchHotDetail().then(r => { hotDetail.value = (r.data || []).slice(0, 10); }).catch(() => {});
});

watch(kw, v => {
  if (v.trim().length <= 1) { suggests.value = []; return; }
  api2.searchSuggest(v.trim()).then(r => {
    suggests.value = ['songs', 'artists', 'playlists'].flatMap(k => ((r.result as any)?.[k] || []).map((x: any) => x.name)).slice(0, 8);
  }).catch(() => {});
});

function doSearch(k?: string) {
  const word = (k ?? kw.value).trim();
  if (!word) return;
  kw.value = word;
  searched.value = true;
  history.value = [word, ...history.value.filter(x => x !== word)].slice(0, 12);
  localStorage.setItem('pcvue_music_history', JSON.stringify(history.value));
  api.search(word).then(r => results.value = r.result.songs || []).catch(() => results.value = []);
}

function play(r: Song) {
  player.playList(results.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), results.value.indexOf(r));
}
</script>

<style scoped>
:deep(.el-table) { --el-table-bg-color: transparent; --el-table-tr-bg-color: transparent; --el-table-border-color: #23232b; --el-table-header-bg-color: #1a1a20; }
:deep(.el-input__wrapper) { background: #1a1a20; }
</style>
