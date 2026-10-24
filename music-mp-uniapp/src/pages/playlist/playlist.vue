<script setup lang="ts">
/**
 * 歌单详情：封面/名称/描述/曲目列表，点歌播放（以整个歌单为播放队列）。
 */
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPlaylistDetail, getPlaylistTracks } from '../../api'
import type { Playlist, Song } from '../../types/music'
import { formatDurationMs, formatPlayCount } from '../../utils/format'
import { usePlayer } from '../../stores/player'

const player = usePlayer()
const { state } = player

const loading = ref(true)
const playlist = ref<Playlist | null>(null)
const tracks = ref<Song[]>([])
const descExpanded = ref(false)

const descClampable = computed(() => (playlist.value?.description?.length ?? 0) > 60)

onLoad(async (options) => {
  const id = Number(options?.id || 0)
  if (!id) {
    loading.value = false
    return
  }
  const [detail, songs] = await Promise.all([getPlaylistDetail(id), getPlaylistTracks(id)])
  playlist.value = detail
  tracks.value = songs
  loading.value = false
})

function playAll() {
  if (!tracks.value.length) return
  player.play(tracks.value[0], tracks.value)
  uni.navigateTo({ url: `/pages/player/player?id=${tracks.value[0].id}` })
}

function playSong(song: Song) {
  player.play(song, tracks.value)
  uni.navigateTo({ url: `/pages/player/player?id=${song.id}` })
}

function toggleDesc() {
  descExpanded.value = !descExpanded.value
}
</script>

<template>
  <view class="page">
    <uni-load-more
      v-if="loading"
      class="page-loading"
      status="loading"
      icon-size="20"
      :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }"
    />

    <template v-else-if="playlist || tracks.length">
      <!-- 头部 -->
      <view class="header">
        <view class="cover-box">
          <image
            class="cover"
            :src="playlist?.coverImgUrl || tracks[0]?.picUrl"
            mode="aspectFill"
          />
        </view>
        <view class="meta">
          <view class="name">{{ playlist?.name || '歌单' }}</view>
          <view v-if="playlist?.trackCount" class="count">共 {{ playlist.trackCount }} 首</view>
          <view v-if="playlist?.playCount" class="count">{{ formatPlayCount(playlist.playCount) }} 次播放</view>
          <view v-if="playlist?.description" class="desc" :class="{ expanded: descExpanded }" @tap="toggleDesc">
            {{ playlist.description }}
            <text v-if="descClampable" class="desc-toggle">{{ descExpanded ? ' 收起' : ' 展开' }}</text>
          </view>
        </view>
      </view>

      <!-- 播放全部 -->
      <view class="play-all" :class="{ disabled: !tracks.length }" @tap="playAll">
        <view class="play-all-icon">
          <view class="tri" />
        </view>
        <text>播放全部</text>
        <text v-if="tracks.length" class="play-all-count">({{ tracks.length }})</text>
      </view>

      <!-- 曲目 -->
      <view v-if="tracks.length" class="track-list">
        <view
          v-for="(s, i) in tracks"
          :key="s.id"
          class="track-item"
          @tap="playSong(s)"
        >
          <view class="track-index" :class="{ active: state.current?.id === s.id }">
            {{ String(i + 1).padStart(2, '0') }}
          </view>
          <view class="track-info">
            <view class="track-name" :class="{ active: state.current?.id === s.id }">{{ s.name }}</view>
            <view class="track-artist">{{ s.artists }}<text v-if="s.albumName"> - {{ s.albumName }}</text></view>
          </view>
          <view class="track-dt">{{ formatDurationMs(s.duration) }}</view>
        </view>
      </view>
      <view v-else class="empty-tip">
        <view>暂无歌曲数据</view>
        <view class="empty-sub">未配置 API 且快照中没有该歌单的曲目</view>
      </view>
    </template>

    <!-- 空态：detail 和 tracks 都拿不到 -->
    <view v-else class="empty-tip">
      <view class="empty-glyph">♪</view>
      <view>歌单加载失败</view>
      <view class="empty-sub">未配置 API_BASE 且离线快照中没有该歌单（快照仅内置 3778678）</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 24rpx 24rpx 48rpx;
}
.page-loading {
  margin-top: 240rpx;
}

/* 头部 */
.header {
  display: flex;
  padding: 12rpx 8rpx 28rpx;
}
.cover-box {
  width: 220rpx;
  height: 220rpx;
  border-radius: $uni-radius-lg;
  overflow: hidden;
  background: $uni-bg-card;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.55);
  flex-shrink: 0;
}
.cover {
  width: 100%;
  height: 100%;
}
.meta {
  flex: 1;
  min-width: 0;
  margin-left: 28rpx;
}
.name {
  font-size: 34rpx;
  font-weight: 700;
  line-height: 44rpx;
  color: $uni-text-main;
  @include ellipsis(2);
}
.count {
  display: inline-block;
  margin: 14rpx 0 0;
  padding: 4rpx 16rpx;
  font-size: 20rpx;
  color: $uni-text-sub;
  background: $uni-bg-card;
  border-radius: 20rpx;
  &:not(:first-of-type) {
    margin-left: 12rpx;
  }
}
.desc {
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 34rpx;
  color: $uni-text-sub;
  @include ellipsis(2);
  &.expanded {
    display: block;
    -webkit-line-clamp: unset;
    overflow: visible;
    white-space: normal;
  }
}
.desc-toggle {
  color: $uni-primary;
}

/* 播放全部 */
.play-all {
  display: flex;
  align-items: center;
  height: 92rpx;
  padding: 0 28rpx;
  background: $uni-bg-card;
  border-radius: $uni-radius $uni-radius 0 0;
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-main;
  &.disabled {
    opacity: 0.4;
  }
  &:active {
    background: rgba(255, 255, 255, 0.04);
  }
}
.play-all-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: $uni-primary;
}
.tri {
  width: 0;
  height: 0;
  margin-left: 6rpx;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
  border-left: 16rpx solid #fff;
}
.play-all-count {
  margin-left: 10rpx;
  font-size: 22rpx;
  font-weight: 400;
  color: $uni-text-sub;
}

/* 曲目列表：与播放全部连成一个卡片 */
.track-list {
  background: $uni-bg-card;
  border-radius: 0 0 $uni-radius $uni-radius;
  overflow: hidden;
}
.track-item {
  display: flex;
  align-items: center;
  padding: 22rpx 28rpx;
  &:not(:last-child) {
    border-bottom: 1rpx solid $uni-border-color;
  }
  &:active {
    background: rgba(255, 255, 255, 0.04);
  }
}
.track-index {
  width: 72rpx;
  font-size: 26rpx;
  font-style: italic;
  color: $uni-text-sub;
  &.active {
    color: $uni-primary;
  }
}
.track-info {
  flex: 1;
  min-width: 0;
  margin-right: 16rpx;
}
.track-name {
  font-size: 30rpx;
  color: $uni-text-main;
  @include ellipsis(1);
  &.active {
    color: $uni-primary;
  }
}
.track-artist {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
  @include ellipsis(1);
}
.track-dt {
  font-size: 22rpx;
  color: $uni-text-sub;
}

/* 空态 */
.empty-tip {
  padding-top: 200rpx;
  text-align: center;
  font-size: 30rpx;
  color: $uni-text-main;
}
.empty-glyph {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
  line-height: 120rpx;
  border-radius: 50%;
  font-size: 52rpx;
  color: $uni-primary;
  background: rgba(255, 58, 58, 0.12);
}
.empty-sub {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 34rpx;
  color: $uni-text-sub;
}
</style>
