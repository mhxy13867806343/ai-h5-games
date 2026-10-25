<template>
  <div class="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 px-6 py-3 border-t"
       style="background: rgba(16,16,20,.97); border-color: #23232b; backdrop-filter: blur(10px)">
    <img v-if="player.current" :src="player.current.cover"
         class="w-11 h-11 rounded-lg object-cover" :class="{ spin: player.playing }" alt="" />
    <div class="w-44 overflow-hidden" v-if="player.current">
      <div class="text-sm text-white truncate">{{ player.current.name }}</div>
      <div class="text-xs text-np-sub truncate">{{ player.current.artist }}</div>
    </div>
    <template v-if="player.current">
      <el-button circle type="primary" size="large" @click="player.toggle()">
        {{ player.playing ? '⏸' : '▶' }}
      </el-button>
      <el-button circle text @click="player.prev()">⏮</el-button>
      <el-button circle text @click="player.next()">⏭</el-button>
      <span class="text-xs text-np-sub w-10 text-right">{{ fmt(cur) }}</span>
      <el-slider class="flex-1" :max="player.duration || player.current.duration || 100"
                 :model-value="cur" :format-tooltip="fmt" @input="v => (seek = v)"
                 @change="v => { player.seek(v); seek = null }" />
      <span class="text-xs text-np-sub w-10">{{ fmt(player.duration || player.current.duration) }}</span>
      <el-tag v-if="player.unavailable" type="warning" size="small">暂无版权</el-tag>
    </template>
    <span v-else class="text-np-sub text-sm">点一首歌开始播放 🎵</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const player = usePlayerStore();
const seek = ref<number | null>(null);
const cur = computed(() => seek.value ?? player.currentTime);
const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');
</script>

<style scoped>
.spin { animation: spin 14s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
:deep(.el-slider) { flex: 1; }
</style>
