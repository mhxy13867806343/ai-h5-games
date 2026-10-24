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
import { onMounted } from 'vue';
import { showToast } from 'vant';
import { usePlayerStore } from './stores/player';
import MiniPlayer from './components/MiniPlayer.vue';

const player = usePlayerStore();

// PC 端打开 H5 应用时 Toast 提示
onMounted(() => {
  const isPC = window.innerWidth > 750 && !/Mobi|Android|iPhone|iPad|Harmony/i.test(navigator.userAgent);
  if (isPC) {
    showToast({
      message: '📱 这是 H5 移动端应用，建议用手机打开体验更佳',
      duration: 3200,
      position: 'bottom',
    });
  }
});
</script>

<style scoped>
.tab-ico { display: block; font-size: 18px; line-height: 1; margin-bottom: 2px; }
</style>
