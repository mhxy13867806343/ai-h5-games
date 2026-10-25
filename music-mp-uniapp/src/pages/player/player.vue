<script setup lang="ts">
/**
 * 播放器：旋转封面、可拖动进度条、上一首/播放暂停/下一首、
 * 歌词 scroll-into-view 滚动高亮；播放状态来自全局 usePlayer()。
 */
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSongDetail } from '../../api'
import type { Song } from '../../types/music'
import { formatDurationSec } from '../../utils/format'
import { usePlayer } from '../../stores/player'

const player = usePlayer()
const { state } = player

/** 拖动中：slider 显示拖动值而不是播放位置 */
const seeking = ref(false)
const sliderValue = ref(0)
const showQueue = ref(false)

const sliderPercent = computed(() => {
  if (seeking.value) return sliderValue.value
  if (!state.duration || state.duration <= 0) return 0
  return Math.min(Math.round((state.currentTime / state.duration) * 100), 100)
})

/** scroll-into-view 目标：当前歌词行 */
const lyricAnchor = computed(() => (state.lyricIndex >= 0 ? `lyric-${state.lyricIndex}` : ''))

onLoad(async (options) => {
  const id = Number(options?.id || 0)
  if (!id) return
  // 已在播这首歌：直接展示
  if (state.current && state.current.id === id) return
  // 在队列里：切过去
  const inQueue = state.queue.find((s) => s.id === id)
  if (inQueue) {
    player.play(inQueue)
    return
  }
  // 外部直开（如分享/直达）：拉详情后播放
  const song: Song | null = await getSongDetail(id)
  if (song) player.play(song, [song])
})

// 顶栏标题跟随歌曲名
watch(
  () => state.current?.name,
  (name) => {
    if (name) uni.setNavigationBarTitle({ title: name })
  },
  { immediate: true }
)

function onSeeking(e: any) {
  seeking.value = true
  sliderValue.value = Number(e?.detail?.value ?? 0)
}

function onSeekChange(e: any) {
  seeking.value = false
  const percent = Number(e?.detail?.value ?? 0)
  if (!state.duration || state.duration <= 0) return
  player.seek((percent / 100) * state.duration)
}
</script>

<template>
  <view class="page">
    <view v-if="state.current" class="player">
      <!-- 旋转封面（唱片） -->
      <view class="cover-wrap">
        <view class="disc" :class="{ paused: !state.playing }">
          <image
            v-if="state.current.picUrl"
            class="disc-img"
            :src="state.current.picUrl"
            mode="aspectFill"
          />
          <view v-else class="disc-holder">♪</view>
        </view>
        <view class="disc-center" />
      </view>

      <!-- 歌名 / 歌手 -->
      <view class="meta">
        <view class="title-row">
          <text class="title">{{ state.current.name }}</text>
          <text v-if="!state.playable && !state.loading" class="badge-noplay">暂无版权</text>
        </view>
        <view class="sub">{{ state.current.artists }}<text v-if="state.current.albumName"> - {{ state.current.albumName }}</text></view>
      </view>

      <!-- 进度条 -->
      <view class="progress-row">
        <text class="time">{{ formatDurationSec(state.currentTime) }}</text>
        <slider
          class="progress"
          :value="sliderPercent"
          :min="0"
          :max="100"
          :disabled="!state.playable"
          activeColor="#ff3a3a"
          backgroundColor="rgba(255,255,255,0.18)"
          block-size="16"
          block-color="#ffffff"
          @changing="onSeeking"
          @change="onSeekChange"
        />
        <text class="time">{{ formatDurationSec(state.duration) }}</text>
      </view>

      <view class="queue-btn" @tap="showQueue = true">☰ 播放列表（{{ state.queue.length }}）</view>

      <!-- 控制区：上一首 / 播放暂停 / 下一首 -->
      <view class="controls">
        <view class="ctrl" @tap="player.prev()">
          <view class="prev-icon">
            <view class="bar" />
            <view class="tri tri-left" />
          </view>
        </view>

        <view class="ctrl ctrl-main" @tap="player.toggle()">
          <view v-if="state.playing" class="pause-icon">
            <view class="pause-bar" />
            <view class="pause-bar" />
          </view>
          <view v-else class="play-icon">
            <view class="tri tri-main" />
          </view>
        </view>

        <view class="ctrl" @tap="player.next()">
          <view class="next-icon">
            <view class="tri tri-right" />
            <view class="bar" />
          </view>
        </view>
      </view>

      <!-- 歌词 -->
      <scroll-view
        class="lyric-scroll"
        scroll-y
        :scroll-into-view="lyricAnchor"
        scroll-with-animation
      >
        <view class="lyric-list">
          <view
            v-for="(line, i) in state.lyric"
            :id="`lyric-${i}`"
            :key="i"
            class="lyric-line"
            :class="{ active: i === state.lyricIndex }"
            @click="player.seekPlay(line.time)"
          >
            {{ line.text }}
          </view>
          <view v-if="!state.lyric.length" class="lyric-empty">
            {{ state.loading ? '歌词加载中…' : state.playable ? '纯音乐，暂无歌词' : '暂无版权，无法播放' }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 无播放内容 -->
    <view v-else class="empty">
      <view class="empty-glyph">♪</view>
      <view class="empty-text">暂无播放内容</view>
      <view class="empty-sub">去首页或排行榜挑一首歌吧</view>
    </view>
  </view>

    <view v-if="showQueue" class="queue-mask" @tap="showQueue = false">
      <view class="queue-panel" @tap.stop>
        <view class="queue-head">
          <text class="queue-title">当前播放</text>
          <text class="queue-count">{{ state.queue.length }} 首</text>
          <text class="queue-close" @tap="showQueue = false">×</text>
        </view>
        <scroll-view scroll-y class="queue-body">
          <view v-for="(q, i) in state.queue" :key="q.id + '-' + i"
                class="queue-row" :class="{ on: state.current?.id === q.id }"
                @tap="player.playAt(i); showQueue = false">
            <text class="q-idx">{{ i + 1 }}</text>
            <view class="q-info">
              <text class="q-name" :class="{ hot: state.current?.id === q.id }">{{ q.name }}</text>
              <text class="q-artist">{{ q.ar?.map(a => a.name).join('/') || '' }}</text>
            </view>
            <text v-if="state.current?.id === q.id" class="q-playing">♪</text>
          </view>
        </scroll-view>
      </view>
    </view>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.player {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 20rpx 48rpx 40rpx;
}

/* 唱片封面 */
.cover-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20rpx auto 32rpx;
}
.disc {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 420rpx;
  height: 420rpx;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, #3a3a3c 0%, #2a2a2c 34%, #1e1e20 35%, #262628 100%);
  border: 10rpx solid #0e0e10;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.6);
  animation: disc-rotate 18s linear infinite;
  &.paused {
    animation-play-state: paused;
  }
}
.disc-img {
  width: 272rpx;
  height: 272rpx;
  border-radius: 50%;
}
.disc-holder {
  width: 272rpx;
  height: 272rpx;
  line-height: 272rpx;
  border-radius: 50%;
  text-align: center;
  font-size: 80rpx;
  color: $uni-text-sub;
  background: $uni-bg-elevated;
}
.disc-center {
  position: absolute;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #0e0e10;
  border: 6rpx solid #3a3a3c;
}

@keyframes disc-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 歌曲信息 */
.meta {
  text-align: center;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
}
.title {
  max-width: 540rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: $uni-text-main;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.badge-noplay {
  margin-left: 16rpx;
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  color: $uni-primary;
  border: 1rpx solid rgba(255, 58, 58, 0.6);
  border-radius: 20rpx;
  flex-shrink: 0;
}
.sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $uni-text-sub;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 进度 */
.progress-row {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
}
.time {
  width: 96rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
  text-align: center;
  flex-shrink: 0;
}
.progress {
  flex: 1;
  margin: 0 8rpx;
}

/* 控制 */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 28rpx 0 20rpx;
}
.ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  margin: 0 44rpx;
  &:active {
    opacity: 0.7;
  }
}
.ctrl-main {
  width: 132rpx;
  height: 132rpx;
  background: $uni-primary;
  box-shadow: 0 10rpx 32rpx rgba(255, 58, 58, 0.35);
  margin: 0 30rpx;
}

/* 播放/暂停 CSS 图形 */
.play-icon,
.pause-icon,
.prev-icon,
.next-icon {
  display: flex;
  align-items: center;
}
.tri {
  width: 0;
  height: 0;
}
.tri-main {
  margin-left: 8rpx;
  border-top: 22rpx solid transparent;
  border-bottom: 22rpx solid transparent;
  border-left: 34rpx solid #fff;
}
.pause-bar {
  width: 10rpx;
  height: 48rpx;
  margin: 0 7rpx;
  border-radius: 4rpx;
  background: #fff;
}
.prev-icon,
.next-icon {
  .bar {
    width: 6rpx;
    height: 30rpx;
    border-radius: 3rpx;
    background: $uni-text-main;
  }
  .tri-left {
    margin-right: 6rpx;
    border-top: 13rpx solid transparent;
    border-bottom: 13rpx solid transparent;
    border-right: 20rpx solid $uni-text-main;
  }
  .tri-right {
    margin-left: 6rpx;
    border-top: 13rpx solid transparent;
    border-bottom: 13rpx solid transparent;
    border-left: 20rpx solid $uni-text-main;
  }
}

/* 歌词 */
.lyric-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 8rpx;
}
.lyric-list {
  padding: 220rpx 40rpx;
  text-align: center;
}
.lyric-line {
  padding: 18rpx 0;
  font-size: 28rpx;
  line-height: 44rpx;
  color: rgba(255, 255, 255, 0.4);
  &.active {
    font-size: 32rpx;
    font-weight: 700;
    color: $uni-text-main;
  }
}
.lyric-empty {
  padding: 60rpx 0;
  font-size: 26rpx;
  color: $uni-text-sub;
}

/* 空态 */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.empty-glyph {
  width: 140rpx;
  height: 140rpx;
  line-height: 140rpx;
  border-radius: 50%;
  text-align: center;
  font-size: 60rpx;
  color: $uni-primary;
  background: rgba(255, 58, 58, 0.12);
}
.empty-text {
  margin-top: 28rpx;
  font-size: 32rpx;
  color: $uni-text-main;
}
.empty-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $uni-text-sub;
}
</style>

<style scoped>
.queue-btn { align-self: center; font-size: 24rpx; color: #8e8e93; border: 1rpx solid #3a3a3e; border-radius: 999rpx; padding: 10rpx 30rpx; margin-bottom: 16rpx; }
.queue-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.6); z-index: 99; display: flex; align-items: flex-end; }
.queue-panel { width: 100%; max-height: 62vh; background: #1a1a20; border-radius: 24rpx 24rpx 0 0; padding: 20rpx 0 40rpx; }
.queue-head { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 30rpx 20rpx; border-bottom: 1rpx solid rgba(255,255,255,.08); }
.queue-title { font-size: 30rpx; font-weight: 700; color: #f5f5f7; flex: 1; }
.queue-count { font-size: 22rpx; color: #8e8e93; }
.queue-close { font-size: 40rpx; color: #8e8e93; padding: 0 10rpx; }
.queue-body { max-height: 50vh; }
.queue-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 30rpx; }
.queue-row.on { background: rgba(255,58,58,.1); }
.q-idx { width: 44rpx; font-size: 24rpx; color: #8e8e93; font-family: Georgia, serif; }
.q-info { flex: 1; min-width: 0; }
.q-name { font-size: 26rpx; color: #f5f5f7; display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.q-name.hot { color: #ff3a3a; font-weight: 700; }
.q-artist { font-size: 20rpx; color: #8e8e93; display: block; margin-top: 4rpx; }
.q-playing { color: #ff3a3a; font-size: 26rpx; }
</style>
