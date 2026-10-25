<template>
  <div>
    <h2 class="text-white text-2xl mb-4">MV</h2>
    <el-tabs v-model="tab">
      <el-tab-pane label="最新" name="first" />
      <el-tab-pane label="全部" name="top" />
      <el-tab-pane label="推荐" name="reco" />
    </el-tabs>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))">
      <a v-for="m in list" :key="m.id" :href="mvWebUrl(m.id)" target="_blank" rel="noopener" class="block group">
        <div class="relative">
          <img :src="m.cover" class="w-full aspect-video rounded-xl object-cover bg-np-card" loading="lazy" alt="" />
          <span class="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center text-xs">▶</span>
        </div>
        <div class="text-sm text-white mt-2 group-hover:text-np-red">{{ m.name }}</div>
        <div class="text-xs text-np-sub">{{ m.artistName || '' }}</div>
      </a>
    </div>
    <el-empty v-if="!list.length" description="暂无 MV 数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api2, mvWebUrl } from '../api';

const tab = ref('first');
const list = ref<any[]>([]);
watch(tab, () => {
  list.value = [];
  if (tab.value === 'first') api2.mvFirst(30).then(r => list.value = (r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName })));
  else if (tab.value === 'top') api2.topMv(30).then(r => list.value = (r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName })));
  else api2.personalizedMv(20).then(r => list.value = (r.result || []).map((x: any) => ({ id: x.id, cover: x.picUrl, name: x.name, artistName: x.artistName })));
}, { immediate: true });
</script>
