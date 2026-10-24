<template>
  <div class="page">
    <van-nav-bar title="排行榜" />
    <div class="rank-list">
      <div v-for="t in lists" :key="t.id" class="rank-card" @click="$router.push(`/playlist/${t.id}`)">
        <img :src="t.coverImgUrl" class="rank-cover" loading="lazy" />
        <div class="rank-info">
          <div class="rank-name">{{ t.name }}</div>
          <div class="rank-freq">{{ t.updateFrequency || '官方榜' }}</div>
        </div>
        <span class="arrow">→</span>
      </div>
    </div>
    <van-empty v-if="!loading && !lists.length" description="暂无数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type Playlist } from '../api';

const lists = ref<Playlist[]>([]);
const loading = ref(true);
onMounted(async () => {
  try {
    const r = await api.toplist();
    lists.value = r.list.slice(0, 12);
  } finally { loading.value = false; }
});
</script>

<style scoped>
.rank-list { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.rank-card { display: flex; align-items: center; gap: 14px; background: #2a2a2e; border-radius: 14px; padding: 12px; }
.rank-cover { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; background: #1c1c1e; }
.rank-name { font-size: 15px; font-weight: 700; }
.rank-freq { font-size: 12px; color: #8e8e93; margin-top: 4px; }
.rank-info { flex: 1; }
.arrow { color: #8e8e93; }
</style>
