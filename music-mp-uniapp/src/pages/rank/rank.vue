<script setup lang="ts">
/**
 * 排行榜：toplist 卡片列表（封面 / 名称 / 更新频率），点击进入歌单详情。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getToplist } from '../../api'
import type { Playlist } from '../../types/music'

const loading = ref(true)
const list = ref<Playlist[]>([])

onLoad(async () => {
  list.value = await getToplist()
  loading.value = false
})

function open(id: number) {
  uni.navigateTo({ url: `/pages/playlist/playlist?id=${id}` })
}
</script>

<template>
  <view class="page">
    <view v-if="list.length" class="rank-list">
      <view v-for="t in list" :key="t.id" class="rank-card" @tap="open(t.id)">
        <view class="cover-box">
          <image class="cover" :src="t.coverImgUrl" mode="aspectFill" />
          <view v-if="t.updateFrequency" class="freq">{{ t.updateFrequency }}</view>
        </view>
        <view class="info">
          <view class="name">{{ t.name }}</view>
          <view v-if="t.trackCount" class="count">共 {{ t.trackCount }} 首</view>
        </view>
        <uni-icons type="forward" size="18" color="#8a8a8e" />
      </view>
    </view>

    <uni-load-more
      v-else-if="loading"
      class="rank-loading"
      status="loading"
      icon-size="20"
      :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }"
    />
    <view v-else class="empty">
      <view class="empty-glyph">榜</view>
      <view class="empty-text">暂无榜单数据</view>
      <view class="empty-sub">未配置 API 且快照中没有 toplist</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 24rpx 24rpx 48rpx;
}

.rank-list {
  background: $uni-bg-card;
  border-radius: $uni-radius;
  overflow: hidden;
}

.rank-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  &:not(:last-child) {
    border-bottom: 1rpx solid $uni-border-color;
  }
  &:active {
    background: rgba(255, 255, 255, 0.04);
  }
}

.cover-box {
  position: relative;
  width: 128rpx;
  height: 128rpx;
  border-radius: $uni-radius;
  overflow: hidden;
  background: $uni-bg-elevated;
  flex-shrink: 0;
}
.cover {
  width: 100%;
  height: 100%;
}
.freq {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4rpx 0;
  text-align: center;
  font-size: 18rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
}

.info {
  flex: 1;
  min-width: 0;
  margin: 0 20rpx;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-main;
  @include ellipsis(1);
}
.count {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
}

.rank-loading {
  margin-top: 200rpx;
}

.empty {
  padding-top: 220rpx;
  text-align: center;
}
.empty-glyph {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
  line-height: 120rpx;
  border-radius: 50%;
  font-size: 48rpx;
  color: $uni-primary;
  background: rgba(255, 58, 58, 0.12);
}
.empty-text {
  font-size: 30rpx;
  color: $uni-text-main;
}
.empty-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
}
</style>
