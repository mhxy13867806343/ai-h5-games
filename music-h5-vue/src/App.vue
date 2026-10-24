<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <keep-alive include="HomePage">
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <!-- 迷你播放条 -->
    <MiniPlayer v-if="player.current" />
    <van-tabbar route safe-area-inset-bottom>
      <van-tabbar-item replace to="/"><span class="tab-ico">🎵</span>首页</van-tabbar-item>
      <van-tabbar-item replace to="/rank"><span class="tab-ico">🏆</span>排行榜</van-tabbar-item>
      <van-tabbar-item replace to="/search"><span class="tab-ico">🔍</span>搜索</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from './stores/player';
import MiniPlayer from './components/MiniPlayer.vue';

const player = usePlayerStore();
</script>

<style scoped>
.tab-ico { display: block; font-size: 18px; line-height: 1; margin-bottom: 2px; }
</style>
