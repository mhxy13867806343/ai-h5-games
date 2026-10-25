<template>
  <div>
    <h2 class="text-white text-2xl mb-5">推荐</h2>
    <h3 class="text-white text-lg mb-3">推荐歌单</h3>
    <div class="grid gap-4 mb-7" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
      <el-card v-for="p in recoPlaylists" :key="p.id" shadow="hover" body-style="padding:10px" class="cursor-pointer"
               @click="router.push(`/playlist/${p.id}`)">
        <img :src="p.picUrl" class="w-full h-[150px] object-cover rounded-lg" loading="lazy" alt="" />
        <div class="text-xs text-white mt-2 leading-snug line-clamp-2">{{ p.name }}</div>
      </el-card>
    </div>
    <h3 class="text-white text-lg mb-3">推荐新音乐</h3>
    <el-table :data="newsongs" size="small" @row-click="(r: any) => playNewsong(r)" :row-style="{ cursor: 'pointer' }">
      <el-table-column label="歌曲"><template #default="{ row }"><b class="text-white">{{ row.name }}</b></template></el-table-column>
      <el-table-column label="歌手"><template #default="{ row }">{{ artistStr(row) }}</template></el-table-column>
    </el-table>
    <h3 class="text-white text-lg mb-3 mt-7">推荐电台</h3>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))">
      <div v-for="d in djRadios" :key="d.id" class="text-center">
        <img :src="d.picUrl" class="w-full aspect-square rounded-2xl object-cover bg-np-card" loading="lazy" alt="" />
        <div class="text-xs mt-2 text-white leading-snug">{{ d.name }}</div>
      </div>
    </div>
    <h3 class="text-white text-lg mb-3 mt-7">独家放送</h3>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      <div v-for="e in exclusives" :key="e.id">
        <img :src="e.picUrl || e.cover" class="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
        <div class="text-sm text-white mt-2">{{ e.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api2 } from '../api';
import { usePlayerStore } from '../stores/player';

const router = useRouter();
const player = usePlayerStore();
const recoPlaylists = ref<any[]>([]);
const newsongs = ref<any[]>([]);
const djRadios = ref<any[]>([]);
const exclusives = ref<any[]>([]);

const artistStr = (s: any) => (s.song?.artists || s.artists || []).map((a: any) => a.name).join('/');
function playNewsong(s: any) {
  player.playSong({
    id: s.id, name: s.name, artist: artistStr(s),
    cover: s.song?.album?.picUrl || s.picUrl || '', duration: (s.song?.duration || 0) / 1000,
  });
}

onMounted(async () => {
  const [p, n, d, e] = await Promise.allSettled([
    api2.personalized(12), api2.personalizedNewsong(12), api2.djRecommend(), api2.privateContent(),
  ]);
  if (p.status === 'fulfilled') recoPlaylists.value = p.value.result || [];
  if (n.status === 'fulfilled') newsongs.value = n.value.result || [];
  if (d.status === 'fulfilled') djRadios.value = (d.value.djRadios || []).slice(0, 12);
  if (e.status === 'fulfilled') exclusives.value = e.value.result || [];
});
</script>
