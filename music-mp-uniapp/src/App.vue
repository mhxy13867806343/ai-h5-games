<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 全局初始化；播放器 audio context 由 stores/player.ts 首次播放时懒创建
  console.log('[music] App Launch')
})
</script>

<style>
/* 全局基础样式：小程序没有 body，需用 page 选择器 */
page {
  background-color: #121212;
  color: #f5f5f7;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}
</style>
