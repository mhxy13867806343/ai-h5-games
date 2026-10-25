<template>
  <div v-if="player.current" class="mini" @click="$router.push('/player')">
    <img :src="player.current.cover" class="mini-cover" :class="{ spinning: player.playing }" />
    <div class="mini-info">
      <div class="mini-name">{{ player.current.name }}</div>
      <div class="mini-artist">{{ player.current.artist }}</div>
    </div>
    <span class="mini-btn" @click.stop="player.prev()">⏮</span>
    <span class="mini-btn" @click.stop="player.toggle()">{{ player.playing ? '⏸' : '▶' }}</span>
    <span class="mini-btn" @click.stop="player.next()">⏭</span>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player';
const player = usePlayerStore();
</script>

<style scoped>
.mini { position: fixed; left: 10px; right: 10px; bottom: 56px; z-index: 20; display: flex; align-items: center; gap: 10px; background: rgba(42,42,46,.96); border-radius: 14px; padding: 8px 12px; backdrop-filter: blur(8px); }
.mini-cover { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.mini-cover.spinning { animation: miniSpin 12s linear infinite; }
@keyframes miniSpin { to { transform: rotate(360deg); } }
.mini-info { flex: 1; min-width: 0; }
.mini-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-artist { font-size: 10px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-btn { font-size: 20px; color: #ff3a3a; padding: 4px; }
</style>
