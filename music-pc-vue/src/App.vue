<template>
  <el-container class="min-h-screen">
    <el-aside width="210px" class="sider">
      <div class="brand">
        <span class="text-2xl">🎧</span>
        <b class="text-white text-lg tracking-wide">云音乐 · PC</b>
        <span class="text-[10px] text-np-sub">Vue</span>
      </div>
      <el-menu :default-active="route.path" router background-color="transparent" text-color="#9db4c4" active-text-color="#e8464f">
        <el-menu-item index="/"><span>🏠 发现音乐</span></el-menu-item>
        <el-menu-item index="/rank"><span>🔥 排行榜</span></el-menu-item>
        <el-menu-item index="/search"><span>🔍 搜索音乐</span></el-menu-item>
      </el-menu>
      <div class="foot-note">免登录接口 · musicapi.cn</div>
    </el-aside>
    <el-container>
      <el-main class="main"><router-view /></el-main>
    </el-container>
    <PlayerBar />
  </el-container>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import PlayerBar from './components/PlayerBar.vue';

const route = useRoute();
</script>

<style scoped>
.sider { background: #141419; border-right: 1px solid #23232b; position: relative; }
.brand { display: flex; align-items: baseline; gap: 8px; padding: 20px 20px 14px; }
.foot-note { position: absolute; bottom: 16px; left: 20px; font-size: 11px; color: #8e8e93; }
.main { background: #101014; padding-bottom: 110px; }
:deep(.el-menu) { border-right: none; }
</style>
