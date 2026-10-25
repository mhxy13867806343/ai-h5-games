<template>
  <div>
    <el-input v-model="kw" size="large" placeholder="搜索歌曲 / 歌手 / 专辑" class="mb-5" style="max-width: 560px"
              @keyup.enter="doSearch()">
      <template #append><el-button @click="doSearch()">搜索</el-button></template>
    </el-input>
    <div v-if="!searched" class="mb-6">
      <b class="text-white">热搜</b>
      <div class="flex flex-wrap gap-2 mt-3">
        <el-tag v-for="h in hots" :key="h.first" type="danger" effect="plain" class="cursor-pointer" @click="doSearch(h.first)">
          {{ h.first }}
        </el-tag>
      </div>
    </div>
    <el-table v-else :data="results" size="small" style="width: 100%; background: transparent"
              @row-click="(r: any) => play(results.indexOf(r) === -1 ? 0 : results.indexOf(r))" :row-style="{ cursor: 'pointer' }">
      <el-table-column label="#" width="60">
        <template #default="{ $index }">{{ $index + 1 }}</template>
      </el-table-column>
      <el-table-column label="歌曲">
        <template #default="{ row }"><b class="text-white">{{ row.name }}</b></template>
      </el-table-column>
      <el-table-column label="歌手">
        <template #default="{ row }">{{ songArtists(row) }}</template>
      </el-table-column>
      <el-table-column label="专辑" show-overflow-tooltip>
        <template #default="{ row }">{{ albumName(row) }}</template>
      </el-table-column>
      <el-table-column label="时长" width="90">
        <template #default="{ row }">{{ fmtTime(songDuration(row)) }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="searched && !results.length" description="没有找到相关歌曲" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
const albumName = (r: Song) => r.al?.name || r.album?.name || '-';
import { usePlayerStore } from '../stores/player';
import { fmtTime } from '../utils/format';

const player = usePlayerStore();
const kw = ref('');
const hots = ref<{ first: string }[]>([]);
const results = ref<Song[]>([]);
const searched = ref(false);

onMounted(async () => {
  try { hots.value = (await api.searchHot())?.result?.hots.slice(0, 14) || []; } catch { /* ignore */ }
});

async function doSearch(k?: string) {
  const word = (k ?? kw.value).trim();
  if (!word) return;
  kw.value = word;
  searched.value = true;
  try { const r = await api.search(word); results.value = r.result.songs || []; } catch { results.value = []; }
}

function play(i: number) {
  player.playList(results.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), i);
}
</script>

<style scoped>
:deep(.el-table) { --el-table-bg-color: transparent; --el-table-tr-bg-color: transparent; --el-table-border-color: #23232b; --el-table-header-bg-color: #1a1a20; }
:deep(.el-input__wrapper) { background: #1a1a20; }
</style>
