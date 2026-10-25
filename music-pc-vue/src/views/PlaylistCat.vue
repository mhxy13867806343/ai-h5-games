<template>
  <div>
    <h2 class="text-white text-2xl mb-4">歌单分类</h2>
    <h3 class="text-white text-base mb-2">热门标签</h3>
    <div class="flex flex-wrap gap-2 mb-4">
      <el-tag v-for="h in hotTags" :key="h.name" :type="cat === h.name ? 'danger' : 'info'" effect="plain"
              class="cursor-pointer" @click="cat = h.name; loadPlaylists()">{{ h.name }}</el-tag>
    </div>
    <h3 class="text-white text-base mb-2">全部分类</h3>
    <div class="flex flex-wrap gap-2 mb-4">
      <template v-for="g in groups" :key="g.name">
        <el-tag v-for="c in g.subs" :key="c.name" type="info" effect="plain" class="cursor-pointer"
                @click="cat = c.name; loadPlaylists()">{{ c.name }}</el-tag>
      </template>
    </div>
    <h3 class="text-white text-base mb-2">精品歌单 <el-tag type="danger" size="small">HQ</el-tag></h3>
    <div class="grid gap-4 mb-7" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
      <el-card v-for="p in hq" :key="p.id" shadow="hover" body-style="padding:10px" class="cursor-pointer"
               @click="router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="w-full h-[150px] object-cover rounded-lg" loading="lazy" alt="" />
        <div class="text-xs text-white mt-2 leading-snug line-clamp-2">{{ p.name }}</div>
      </el-card>
    </div>
    <h3 class="text-white text-base mb-2">{{ cat }} 歌单</h3>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
      <el-card v-for="p in playlists" :key="p.id" shadow="hover" body-style="padding:10px" class="cursor-pointer"
               @click="router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="w-full h-[150px] object-cover rounded-lg" loading="lazy" alt="" />
        <div class="text-xs text-white mt-2 leading-snug line-clamp-2">{{ p.name }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api2 } from '../api';

const router = useRouter();
const hotTags = ref<any[]>([]);
const groups = ref<any[]>([]);
const hq = ref<any[]>([]);
const playlists = ref<any[]>([]);
const cat = ref('华语');

function loadPlaylists() {
  playlists.value = [];
  fetch(`https://www.musicapi.cn/top/playlist?cat=${encodeURIComponent(cat.value)}&limit=30`)
    .then(r => r.json()).then(r => playlists.value = r.playlists || []);
}
onMounted(() => {
  api2.catlist().then(r => groups.value = Object.values(r.all || {}).filter((x: any) => x.subs?.length)).catch(() => {});
  api2.playlistHot().then(r => setTags(r)).catch(() => {});
  api2.highquality('华语', 12).then(r => hq.value = r.playlists || []).catch(() => {});
  loadPlaylists();
});
function setTags(r: any) { hotTags.value = r.tags || []; }
</script>
