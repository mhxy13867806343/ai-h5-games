<template>
  <div>
    <h2 class="text-white text-2xl mb-5">发现音乐</h2>
    <el-carousel height="300px" class="rounded-xl overflow-hidden mb-8" :interval="4000">
      <el-carousel-item v-for="b in banners" :key="b.pic">
        <img :src="b.pic" class="w-full h-full object-cover" alt="" />
      </el-carousel-item>
    </el-carousel>

    <h3 class="text-white text-lg mb-4">热门歌单</h3>
    <div class="grid gap-4 mb-8" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))">
      <el-card v-for="p in playlists" :key="p.id" shadow="hover" body-style="padding:10px"
               class="cursor-pointer text-center" @click="router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="w-full h-[160px] object-cover rounded-lg" loading="lazy" alt="" />
        <div class="text-xs text-white leading-snug mt-2 line-clamp-2">{{ p.name }}</div>
        <div class="text-[11px] text-np-sub">▶ {{ fmtCount(p.playCount) }}</div>
      </el-card>
    </div>

    <h3 class="text-white text-lg mb-4">新歌速递</h3>
    <el-table :data="newSongs" size="small" style="width: 100%; background: transparent" @row-click="(r: any, _c: any, i: number) => play(i)"
              :row-style="{ cursor: 'pointer' }">
      <el-table-column label="#" width="60">
        <template #default="{ $index }"><b :style="{ color: $index < 3 ? '#e8464f' : '#8e8e93' }">{{ $index + 1 }}</b></template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, songArtists, songDuration, songCover, type Song } from '../api';
import { usePlayerStore } from '../stores/player';
import { fmtCount, fmtTime } from '../utils/format';

const router = useRouter();
const player = usePlayerStore();
const banners = ref<{ pic: string }[]>([]);
const playlists = ref<any[]>([]);
const newSongs = ref<Song[]>([]);

onMounted(async () => {
  const [b, p, n] = await Promise.allSettled([api.banner(), api.topPlaylist(12), api.newSongs()]);
  if (b.status === 'fulfilled') banners.value = b.value.banners.map((x: any) => ({ pic: x.pic || x.imageUrl || x.bigImageUrl || '' })).slice(0, 8);
  if (p.status === 'fulfilled') playlists.value = p.value.playlists;
  if (n.status === 'fulfilled') newSongs.value = n.value.data;
});

function play(i: number) {
  player.playList(newSongs.value.map(s => ({
    id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000,
  })), i);
}
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
:deep(.el-card) { background: #1a1a20; border-color: #23232b; }
:deep(.el-table) { --el-table-bg-color: transparent; --el-table-tr-bg-color: transparent; --el-table-border-color: #23232b; --el-table-header-bg-color: #1a1a20; }
</style>
