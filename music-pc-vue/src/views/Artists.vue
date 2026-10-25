<template>
  <div>
    <h2 class="text-white text-2xl mb-4">歌手</h2>
    <div class="flex flex-wrap gap-2 mb-5">
      <el-tag v-for="c in cats" :key="c.v" :type="type === c.v ? 'danger' : 'info'" effect="plain"
              class="cursor-pointer" @click="type = c.v">{{ c.t }}</el-tag>
    </div>
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))">
      <div v-for="a in artists" :key="a.id" class="text-center cursor-pointer group" @click="router.push(`/artist/${a.id}`)">
        <img :src="a.img1v1Url || a.picUrl" class="w-full aspect-square rounded-2xl object-cover bg-np-card group-hover:scale-[1.03] transition" loading="lazy" alt="" />
        <div class="text-sm mt-2 text-white">{{ a.name }}</div>
      </div>
    </div>
    <div v-if="loading" class="grid place-items-center h-40"><el-icon class="is-loading"><Loading /></el-icon></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Loading } from '@element-plus/icons-vue';
import { api, api2 } from '../api';

const router = useRouter();
const cats = [{ t: '热门', v: -1 }, { t: '华语男', v: 1 }, { t: '华语女', v: 2 }, { t: '华语组合', v: 3 }, { t: '欧美男', v: 5 }, { t: '欧美女', v: 6 }, { t: '欧美组合', v: 7 }, { t: '日本男', v: 8 }, { t: '韩国男', v: 16 }];
const type = ref(-1);
const artists = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true; artists.value = [];
  try {
    const r = type.value === -1 ? await api.topArtists(40) : await api2.artistList(type.value, 40);
    artists.value = r.artists || [];
  } finally { loading.value = false; }
}
onMounted(load);
watch(type, load);
</script>
