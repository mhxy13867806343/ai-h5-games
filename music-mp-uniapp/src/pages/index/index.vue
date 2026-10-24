<script setup lang="ts">
/**
 * 首页：轮播（banner）、热门歌单横滑网格（topPlaylist）、
 * 热门歌手（topArtists）、新歌速递（newSongs）。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getBanner, getNewSongs, getTopArtists, getTopPlaylist } from '../../api'
import type { Artist, BannerItem, Playlist, Song } from '../../types/music'
import { formatDurationMs, formatPlayCount } from '../../utils/format'
import { usePlayer } from '../../stores/player'

const player = usePlayer()

const loading = ref(true)
const banners = ref<BannerItem[]>([])
const playlists = ref<Playlist[]>([])
const artists = ref<Artist[]>([])
const newSongs = ref<Song[]>([])

onLoad(async () => {
  const [bannerData, playlistData, artistData, songData] = await Promise.all([
    getBanner(),
    getTopPlaylist(12),
    getTopArtists(10),
    getNewSongs(7),
  ])
  banners.value = bannerData
  playlists.value = playlistData
  artists.value = artistData
  newSongs.value = songData
  loading.value = false
})

function openPlaylist(id: number) {
  uni.navigateTo({ url: `/pages/playlist/playlist?id=${id}` })
}

function openArtist(name: string) {
  uni.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(name)}` })
}

function playSong(song: Song) {
  player.play(song, newSongs.value)
  uni.navigateTo({ url: `/pages/player/player?id=${song.id}` })
}

const { state } = player
</script>

<template>
  <view class="page">
    <!-- 轮播 -->
    <view class="banner-wrap">
      <swiper
        v-if="banners.length"
        class="banner-swiper"
        autoplay
        circular
        interval="4000"
        duration="500"
        indicator-dots
        indicator-color="rgba(255,255,255,0.35)"
        indicator-active-color="#ff3a3a"
      >
        <swiper-item v-for="(b, i) in banners" :key="i">
          <view class="banner-item">
            <image class="banner-img" :src="b.pic" mode="aspectFill" />
            <view v-if="b.typeTitle" class="banner-tag">{{ b.typeTitle }}</view>
          </view>
        </swiper-item>
      </swiper>
      <view v-else-if="loading" class="banner-skeleton" />
      <view v-else class="banner-skeleton banner-empty">暂无轮播内容</view>
    </view>

    <!-- 热门歌单 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">热门歌单</text>
        <text class="section-sub">每日更新</text>
      </view>
      <scroll-view v-if="playlists.length" class="h-scroll" scroll-x :show-scrollbar="false">
        <view class="h-row">
          <view v-for="p in playlists" :key="p.id" class="pl-card" @tap="openPlaylist(p.id)">
            <view class="pl-cover-box">
              <image class="pl-cover" :src="p.coverImgUrl" mode="aspectFill" />
              <view v-if="p.playCount" class="pl-count">▶ {{ formatPlayCount(p.playCount) }}</view>
            </view>
            <view class="pl-name">{{ p.name }}</view>
          </view>
        </view>
      </scroll-view>
      <uni-load-more v-else-if="loading" status="loading" icon-size="20" :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }" />
      <view v-else class="empty-tip">暂无歌单数据</view>
    </view>

    <!-- 热门歌手 -->
    <view v-if="artists.length" class="section">
      <view class="section-header">
        <text class="section-title">热门歌手</text>
      </view>
      <scroll-view class="h-scroll" scroll-x :show-scrollbar="false">
        <view class="h-row">
          <view v-for="a in artists" :key="a.id" class="ar-item" @tap="openArtist(a.name)">
            <image class="ar-avatar" :src="a.picUrl || a.img1v1Url" mode="aspectFill" />
            <view class="ar-name">{{ a.name }}</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 新歌速递 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">新歌速递</text>
        <text class="section-sub">华语</text>
      </view>
      <view v-if="newSongs.length" class="song-list">
        <view
          v-for="(s, i) in newSongs"
          :key="s.id"
          class="song-item"
          @tap="playSong(s)"
        >
          <view class="song-index" :class="{ active: state.current?.id === s.id }">{{ i + 1 }}</view>
          <view class="song-info">
            <view class="song-name" :class="{ active: state.current?.id === s.id }">{{ s.name }}</view>
            <view class="song-artist">
              {{ s.artists }}<text v-if="s.albumName"> - {{ s.albumName }}</text>
            </view>
          </view>
          <view class="song-dt">{{ formatDurationMs(s.duration) }}</view>
        </view>
      </view>
      <uni-load-more v-else-if="loading" status="loading" icon-size="20" :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }" />
      <view v-else class="empty-tip">暂无新歌数据</view>
    </view>

    <view class="footer-tip">免登录接口 + 快照回退演示 · 配置见 src/config.ts</view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 24rpx 24rpx 48rpx;
}

/* 轮播 */
.banner-wrap {
  margin-bottom: 32rpx;
}
.banner-swiper,
.banner-skeleton {
  width: 100%;
  height: 320rpx;
  border-radius: $uni-radius-lg;
  overflow: hidden;
}
.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
}
.banner-img {
  width: 100%;
  height: 100%;
  border-radius: $uni-radius-lg;
}
.banner-tag {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 6rpx 18rpx;
  font-size: 20rpx;
  color: #fff;
  background: linear-gradient(135deg, $uni-primary, $uni-primary-dark);
  border-radius: $uni-radius-lg 0 $uni-radius-lg 0;
}
.banner-skeleton {
  background: $uni-bg-card;
}
.banner-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $uni-text-sub;
  font-size: 26rpx;
}

/* 区块 */
.section {
  margin-bottom: 36rpx;
}
.section-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $uni-text-main;
}
.section-sub {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
}

/* 横滑容器 */
.h-scroll {
  width: 100%;
  white-space: nowrap;
}
.h-row {
  display: inline-flex;
  padding-bottom: 8rpx;
}

/* 歌单卡片 */
.pl-card {
  display: inline-block;
  width: 210rpx;
  margin-right: 20rpx;
  vertical-align: top;
}
.pl-cover-box {
  position: relative;
  width: 210rpx;
  height: 210rpx;
  border-radius: $uni-radius;
  overflow: hidden;
  background: $uni-bg-card;
}
.pl-cover {
  width: 100%;
  height: 100%;
}
.pl-count {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 0 0 0 $uni-radius;
}
.pl-name {
  margin-top: 12rpx;
  height: 64rpx;
  font-size: 24rpx;
  line-height: 32rpx;
  color: $uni-text-desc;
  @include ellipsis(2);
}

/* 歌手 */
.ar-item {
  display: inline-block;
  width: 132rpx;
  margin-right: 24rpx;
  text-align: center;
}
.ar-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $uni-bg-card;
}
.ar-name {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $uni-text-desc;
  @include ellipsis(1);
}

/* 歌曲列表 */
.song-list {
  background: $uni-bg-card;
  border-radius: $uni-radius;
  overflow: hidden;
}
.song-item {
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
  &:not(:last-child) {
    border-bottom: 1rpx solid $uni-border-color;
  }
  &:active {
    background: rgba(255, 255, 255, 0.04);
  }
}
.song-index {
  width: 64rpx;
  font-size: 30rpx;
  color: $uni-text-sub;
  text-align: center;
  &.active {
    color: $uni-primary;
  }
}
.song-info {
  flex: 1;
  min-width: 0;
  margin: 0 16rpx;
}
.song-name {
  font-size: 30rpx;
  color: $uni-text-main;
  @include ellipsis(1);
  &.active {
    color: $uni-primary;
  }
}
.song-artist {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
  @include ellipsis(1);
}
.song-dt {
  font-size: 22rpx;
  color: $uni-text-sub;
}

.empty-tip {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: $uni-text-sub;
}
.footer-tip {
  margin-top: 16rpx;
  text-align: center;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.25);
}
</style>
