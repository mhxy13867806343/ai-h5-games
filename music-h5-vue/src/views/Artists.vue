<template>
  <div class="page">
    <van-nav-bar title="歌手" />
    <div class="cat-chips">
      <span v-for="c in cats" :key="c.v" class="hot-tag" :class="{ on: type === c.v }" @click="type = c.v; load()">{{ c.t }}</span>
    </div>
    <div class="artist-grid">
      <div v-for="a in artists" :key="a.id" class="ar-cell" @click="$router.push(`/artist/${a.id}`)">
        <img :src="a.img1v1Url || a.picUrl" class="ar-img" loading="lazy" alt="" />
        <span class="ar-name">{{ a.name }}</span>
      </div>
    </div>
    <van-loading v-if="loading" class="load" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, api2 } from '../api';

const cats = [{ t: '热门', v: -1 }, { t: '华语男', v: 1 }, { t: '华语女', v: 2 }, { t: '华语组合', v: 3 }, { t: '欧美男', v: 5 }, { t: '欧美女', v: 6 }, { t: '欧美组合', v: 7 }, { t: '日本男', v: 8 }, { t: '韩国男', v: 16 }];
const type = ref(-1);
const artists = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  artists.value = [];
  try {
    if (type.value === -1) {
      const r = await api.topArtists(40);
      artists.value = r.artists;
    } else {
      const r = await api2.artistList(type.value, 40);
      artists.value = r.artists;
    }
  } finally { loading.value = false; }
}
onMounted(load);
</script>

<style scoped>
.cat-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; }
.hot-tag { padding: 6px 14px; background: #2a2a2e; border-radius: 16px; font-size: 13px; }
.hot-tag.on { background: #ff3a3a; color: #fff; }
.artist-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 4px 12px; }
.ar-cell { text-align: center; }
.ar-img { width: 100%; aspect-ratio: 1; border-radius: 12px; object-fit: cover; background: #2a2a2e; }
.ar-name { font-size: 12px; display: block; margin-top: 6px; }
.load { margin: 30px auto; }
</style>
