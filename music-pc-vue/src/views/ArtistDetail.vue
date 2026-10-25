<template>
  <div>
    <div v-if="info" class="flex items-center gap-6 mb-6">
      <img :src="info.cover" class="w-28 h-28 rounded-full object-cover bg-np-card" alt="" />
      <div>
        <h2 class="text-white text-2xl">{{ info.name }}</h2>
        <div class="text-np-sub text-sm mt-2">专辑 {{ info.albumSize }} · MV {{ info.mvSize }} · 歌曲 {{ info.musicSize }}</div>
      </div>
    </div>
    <el-tabs v-model="tab">
      <el-tab-pane label="热门50">
        <el-table :data="topSongs" size="small" @row-click="(r: any) => playTop(r)" :row-style="{ cursor: 'pointer' }">
          <el-table-column label="#" width="60"><template #default="{ $index }"><b :style="{ color: $index < 3 ? '#e8464f' : '#8e8e93' }">{{ $index + 1 }}</b></template></el-table-column>
          <el-table-column label="歌曲"><template #default="{ row }"><b class="text-white">{{ row.name }}</b></template></el-table-column>
          <el-table-column label="时长" width="90"><template #default="{ row }">{{ fmtTime(row.dt) }}</template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="全部歌曲">
        <el-table :data="allSongs" size="small" @row-click="(r: any) => playAll(r)" :row-style="{ cursor: 'pointer' }">
          <el-table-column label="#" width="60"><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
          <el-table-column label="歌曲"><template #default="{ row }"><b class="text-white">{{ row.name }}</b></template></el-table-column>
          <el-table-column label="时长" width="90"><template #default="{ row }">{{ fmtTime(row.dt) }}</template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="专辑">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))">
          <div v-for="a in albums" :key="a.id" class="text-center">
            <img :src="a.picUrl" class="w-full aspect-square rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
            <div class="text-xs mt-2 text-white leading-snug">{{ a.name }}</div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="MV">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
          <a v-for="m in mvs" :key="m.id" :href="mvWebUrl(m.id)" target="_blank" rel="noopener" class="block group">
            <img :src="m.cover" class="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
            <div class="text-sm text-white mt-2 group-hover:text-np-red">{{ m.name }}</div>
          </a>
        </div>
      </el-tab-pane>
      <el-tab-pane label="简介">
        <div class="text-np-sub text-sm leading-relaxed whitespace-pre-wrap max-w-3xl">
          <template v-for="(d, i) in descs" :key="i"><b class="text-white block mt-3">{{ d.ti }}</b>{{ d.txt }}</template>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, api2, songArtists, songDuration, songCover, mvWebUrl, type Song } from '../api';
import { usePlayerStore } from '../stores/player';
import { fmtTime } from '../utils/format';

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const id = Number(route.params.id);
const info = ref<any>(null);
const topSongs = ref<Song[]>([]);
const allSongs = ref<Song[]>([]);
const albums = ref<any[]>([]);
const mvs = ref<any[]>([]);
const descs = ref<any[]>([]);
const tab = ref('0');

const playTop = (r: Song) => {
  player.playList(topSongs.value.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })), topSongs.value.indexOf(r));
  router.push('/player');
};
const playAll = (r: Song) => {
  player.playList(allSongs.value.map(s => ({ id: s.id, name: s.name, artist: songArtists(s), cover: songCover(s), duration: songDuration(s) / 1000 })), allSongs.value.indexOf(r));
  router.push('/player');
};

onMounted(async () => {
  const [d, top, ab, de] = await Promise.allSettled([
    api2.artistDetail(id), api2.artistTopSong(id), api2.artistAlbum(id, 24), api2.artistDesc(id),
  ]);
  if (d.status === 'fulfilled') info.value = d.value.data?.artist;
  if (top.status === 'fulfilled') topSongs.value = top.value.songs || [];
  if (ab.status === 'fulfilled') albums.value = ab.value.hotAlbums || [];
  if (de.status === 'fulfilled') descs.value = de.value.introduction || [];
  api2.artistMv(id).then(r => mvs.value = r.mvs || []).catch(() => {});
  api.artistSongs(id, 50).then(r => allSongs.value = r.songs || []).catch(() => {});
});
</script>
