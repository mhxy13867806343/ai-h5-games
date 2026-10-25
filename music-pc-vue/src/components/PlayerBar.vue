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
      <el-button circle text title="歌词 / 播放列表" @click="drawerOpen = true">☰</el-button>
      <span class="text-xs text-np-sub w-10 text-right">{{ fmt(cur) }}</span>
      <el-slider class="flex-1" :max="player.duration || player.current.duration || 100"
                 :model-value="cur" :format-tooltip="fmt" @input="v => (seek = v)"
                 @change="v => { player.seek(v); seek = null }" />
      <span class="text-xs text-np-sub w-10">{{ fmt(player.duration || player.current.duration) }}</span>
      <el-tag v-if="player.unavailable" type="warning" size="small">暂无版权</el-tag>
    </template>
    <span v-else class="text-np-sub text-sm">点一首歌开始播放 🎵</span>

    <el-drawer v-model="drawerOpen" :title="player.current ? `${player.current.name} - ${player.current.artist}` : ''" size="420px">
      <el-tabs>
        <el-tab-pane label="歌词">
          <div ref="lyricBoxRef" class="h-[72vh] overflow-y-auto text-center py-4">
            <p v-for="(l, i) in player.lyrics" :key="i" class="lyric-line cursor-pointer" :class="{ on: i === activeLyric }"
               @click="player.seekPlay(l.time)">{{ l.text || '♪' }}</p>
            <p v-if="!player.lyrics.length" class="lyric-line on">纯音乐 / 暂无歌词</p>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="`播放列表(${player.list.length})`">
          <div class="h-[72vh] overflow-y-auto">
            <div v-for="(q, i) in player.list" :key="q.id + '-' + i"
                 class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                 :class="q.id === player.current?.id ? 'bg-np-red/10' : 'hover:bg-white/5'"
                 @click="player.playIndex(i)">
              <span class="w-6 text-np-sub font-serif">{{ i + 1 }}</span>
              <img :src="q.cover" class="w-9 h-9 rounded object-cover" alt="" />
              <div class="flex-1 overflow-hidden">
                <div class="text-sm truncate" :class="q.id === player.current?.id ? 'text-np-red font-bold' : 'text-white'">{{ q.name }}</div>
                <div class="text-xs text-np-sub truncate">{{ q.artist }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePlayerStore } from '../stores/player';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

const player = usePlayerStore();
const seek = ref<number | null>(null);
const drawerOpen = ref(false);
const lyricBoxRef = ref<HTMLElement>();
const cur = computed(() => seek.value ?? player.currentTime);
const fmt = (s: number) => dayjs.duration((s || 0) * 1000).format('mm:ss');

const activeLyric = computed(() => {
  let idx = -1;
  player.lyrics.forEach((l, i) => { if (l.time <= player.currentTime + 0.3) idx = i; });
  return idx;
});

watch(() => player.currentTime, () => {
  const box = lyricBoxRef.value;
  if (!box) return;
  const el = box.children[activeLyric.value] as HTMLElement | undefined;
  if (el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
});
</script>

<style scoped>
.spin { animation: spin 14s linear infinite; }
.lyric-line { font-size: 14px; color: #8e8e93; line-height: 2.4; }
.lyric-line.on { color: #e8464f; font-weight: 700; font-size: 15px; }
:deep(.el-drawer) { background: #16161c; }
@keyframes spin { to { transform: rotate(360deg); } }
:deep(.el-slider) { flex: 1; }
</style>
