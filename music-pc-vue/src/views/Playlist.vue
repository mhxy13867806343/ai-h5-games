<template>
  <div>
    <div v-if="pl" class="flex gap-6 mb-6">
      <img :src="pl.coverImgUrl" class="w-44 h-44 rounded-2xl object-cover" alt="" />
      <div>
        <h2 class="text-white text-2xl">{{ pl.name }}</h2>
        <div class="text-np-sub text-sm my-2">{{ pl.trackCount || tracks.length }} 首</div>
        <p v-if="pl.description" class="text-np-sub text-xs max-w-2xl leading-relaxed">{{ pl.description }}</p>
      </div>
    </div>
    <el-table v-loading="loading" :data="tracks" size="small" style="width: 100%; background: transparent"
              @row-click="(r: any, _c: any, i: number) => play(i)" :row-style="{ cursor: 'pointer' }">
      <el-table-column label="#" width="60">
        <template #default="{ $index }">{{ $index + 1 }}</template>
      </el-table-column>
      <el-table-column label="歌曲">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <img :src="row.al?.picUrl" class="w-9 h-9 rounded" alt="" />
            <b class="text-white">{{ row.name }}</b>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="歌手">
        <template #default="{ row }">{{ songArtists(row) }}</template>
      </el-table-column>
      <el-table-column label="专辑" show-overflow-tooltip>
        <template #default="{ row }">{{ row.al?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="时长" width="90">
        <template #default="{ row }">{{ fmtTime(row.dt) }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !tracks.length" description="曲目暂不可用（接口限流或歌单过新）" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, songArtists, songDuration, songCover, type Song, type Playlist } from '../api';
import { usePlayerStore } from '../stores/player';
import { fmtTime } from '../utils/format';

const route = useRoute();
const player = usePlayerStore();
const pl = ref<Playlist | null>(null);
const tracks = ref<Song[]>([]);
const loading = ref(true);

onMounted(async () => {
  const id = Number(route.params.id);
  const [d, t] = await Promise.all([api.playlistDetail(id), api.playlistTracks(id, 50)]);
  pl.value = d?.playlist || null;
  tracks.value = t?.songs || [];
  loading.value = false;
});

function play(i: number) {
  player.playList(tracks.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), i);
}
</script>

<style scoped>
:deep(.el-table) { --el-table-bg-color: transparent; --el-table-tr-bg-color: transparent; --el-table-border-color: #23232b; --el-table-header-bg-color: #1a1a20; }
</style>
