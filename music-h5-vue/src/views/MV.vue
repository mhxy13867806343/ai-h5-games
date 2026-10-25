<template>
  <div class="page">
    <van-nav-bar title="MV" />
    <div class="cat-chips">
      <span v-for="c in tabs" :key="c.k" class="hot-tag" :class="{ on: tab === c.k }" @click="tab = c.k; load()">{{ c.t }}</span>
    </div>
    <div class="mv-grid">
      <a v-for="m in list" :key="m.id" class="mv-cell" :href="mvWebUrl(m.id)" target="_blank" rel="noopener">
        <div class="mv-cover-wrap"><img :src="m.cover" class="mv-img" loading="lazy" alt="" /><span class="mv-play">▶</span></div>
        <span class="mv-name">{{ m.name }}</span>
        <span class="mv-artist">{{ m.artistName || '' }}</span>
      </a>
    </div>
    <van-empty v-if="!loading && !list.length" description="暂无 MV 数据" />
    <van-loading v-if="loading" class="load" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api2, mvWebUrl } from '../api';

const tabs = [{ k: 'first', t: '最新' }, { k: 'top', t: '全部' }, { k: 'reco', t: '推荐' }];
const tab = ref('first');
const list = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true; list.value = [];
  try {
    if (tab.value === 'first') { const r = await api2.mvFirst(30); list.value = (r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName })); }
    else if (tab.value === 'top') { const r = await api2.topMv(30); list.value = (r.data || []).map((x: any) => ({ id: x.id, cover: x.cover, name: x.name, artistName: x.artistName })); }
    else { const r = await api2.personalizedMv(20); list.value = (r.result || []).map((x: any) => ({ id: x.id, cover: x.picUrl, name: x.name, artistName: x.artistName })); }
  } finally { loading.value = false; }
}
onMounted(load);
</script>

<style scoped>
.cat-chips { display: flex; gap: 8px; padding: 12px; }
.hot-tag { padding: 6px 14px; background: #2a2a2e; border-radius: 16px; font-size: 13px; }
.hot-tag.on { background: #ff3a3a; color: #fff; }
.mv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 4px 12px; }
.mv-cover-wrap { position: relative; }
.mv-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 10px; background: #2a2a2e; display: block; }
.mv-play { position: absolute; right: 8px; bottom: 8px; background: rgba(0,0,0,.55); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; }
.mv-name { font-size: 12px; display: block; margin-top: 6px; line-height: 1.4; }
.mv-artist { font-size: 10px; color: #8e8e93; display: block; margin-top: 2px; }
.load { margin: 30px auto; }
</style>
