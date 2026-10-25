<template>
  <div class="page">
    <van-nav-bar title="歌单分类" left-arrow @click-left="$router.back()" />
    <div class="sec-t">热门标签</div>
    <div class="chips">
      <span v-for="h in hotTags" :key="h.name" class="chip" :class="{ on: cat === h.name }" @click="cat = h.name; loadPlaylists()">{{ h.name }}</span>
    </div>
    <div class="sec-t">全部分类</div>
    <div class="chips">
      <template v-for="g in groups" :key="g.name">
        <span v-for="c in g.subs" :key="c.name" class="chip dim" :class="{ on: cat === c.name }" @click="cat = c.name; loadPlaylists()">{{ c.name }}</span>
      </template>
    </div>
    <div class="sec-t">精品歌单<van-tag type="danger" class="ml">HQ</van-tag></div>
    <div class="hq-grid">
      <div v-for="p in hq" :key="p.id" class="hq-cell" @click="$router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="hq-img" loading="lazy" alt="" />
        <span class="pl-name">{{ p.name }}</span>
      </div>
    </div>
    <div class="sec-t">{{ cat }} 歌单</div>
    <div class="cat-grid">
      <div v-for="p in playlists" :key="p.id" class="hq-cell" @click="$router.push(`/playlist/${p.id}`)">
        <img :src="p.coverImgUrl" class="hq-img" loading="lazy" alt="" />
        <span class="pl-name">{{ p.name }}</span>
      </div>
    </div>
    <van-loading v-if="loading" class="load" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api2 } from '../api';

const hotTags = ref<any[]>([]);
const groups = ref<any[]>([]);
const hq = ref<any[]>([]);
const playlists = ref<any[]>([]);
const cat = ref('华语');
const loading = ref(true);

async function loadPlaylists() {
  loading.value = true; playlists.value = [];
  try { const r = await fetch(`https://www.musicapi.cn/top/playlist?cat=${encodeURIComponent(cat.value)}&limit=30`).then(x => x.json()); playlists.value = r.playlists || []; }
  finally { loading.value = false; }
}

onMounted(async () => {
  const [c, h, q] = await Promise.allSettled([api2.catlist(), api2.playlistHot(), api2.highquality('华语', 12)]);
  if (c.status === 'fulfilled') groups.value = Object.values(c.value.all || {}).filter((x: any) => x.subs?.length);
  if (h.status === 'fulfilled') hotTags.value = h.value.tags || [];
  if (q.status === 'fulfilled') hq.value = q.value.playlists || [];
  loading.value = false;
  loadPlaylists();
});
</script>

<style scoped>
.sec-t { font-size: 15px; font-weight: 700; margin: 16px 12px 10px; display: flex; align-items: center; gap: 6px; }
.ml { margin-left: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 12px; }
.chip { padding: 6px 14px; background: #2a2a2e; border-radius: 16px; font-size: 12px; }
.chip.dim { color: #8e8e93; }
.chip.on { background: #ff3a3a; color: #fff; }
.hq-grid, .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 2px 12px; }
.hq-img { width: 100%; aspect-ratio: 1; border-radius: 10px; object-fit: cover; background: #2a2a2e; }
.hq-cell { text-align: center; }
.pl-name { font-size: 11px; display: block; margin-top: 5px; line-height: 1.4; }
.load { margin: 30px auto; }
</style>
