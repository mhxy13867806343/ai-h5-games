<template>
  <div>
    <h2 class="text-white text-2xl mb-5">排行榜</h2>
    <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      <el-card v-for="t in lists" :key="t.id" shadow="hover" body-style="padding:0" class="cursor-pointer"
               @click="router.push(`/playlist/${t.id}`)">
        <img :src="t.coverImgUrl" class="w-full h-[180px] object-cover" loading="lazy" alt="" />
        <div class="p-3">
          <div class="text-white font-bold">{{ t.name }}</div>
          <div class="text-xs text-np-sub mt-1">{{ t.updateFrequency || '官方榜' }}</div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, type Playlist } from '../api';

const router = useRouter();
const lists = ref<Playlist[]>([]);
onMounted(async () => {
  try { const r = await api.toplist(); lists.value = (r?.list || []).slice(0, 16); } catch { /* 快照兜底 */ }
});
</script>

<style scoped>
:deep(.el-card) { background: #1a1a20; border-color: #23232b; }
</style>
