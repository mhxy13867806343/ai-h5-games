<script setup lang="ts">
/**
 * 搜索：热词（searchHot）点击即搜、输入搜索、历史记录（storage）、
 * 结果分 单曲/歌手 两个 Tab；点歌手进入其热门歌曲（artistSongs）。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getArtistSongs, getSearchHot, search } from '../../api'
import type { Artist, Song } from '../../types/music'
import { formatDurationMs } from '../../utils/format'
import { SEARCH_HISTORY_KEY, SEARCH_HISTORY_MAX } from '../../config'
import { usePlayer } from '../../stores/player'

const player = usePlayer()
const { state } = player

const keyword = ref('')
const hotWords = ref<string[]>([])
const history = ref<string[]>([])

const searched = ref(false)
const searching = ref(false)
const activeTab = ref<'songs' | 'artists'>('songs')
const resultSongs = ref<Song[]>([])
const resultArtists = ref<Artist[]>([])

/** 歌手下钻视图 */
const artistView = ref<Artist | null>(null)
const artistSongs = ref<Song[]>([])
const artistLoading = ref(false)

onLoad(async (options) => {
  loadHistory()
  hotWords.value = await getSearchHot()
  const kw = decodeURIComponent(options?.keyword || '')
  if (kw) {
    keyword.value = kw
    doSearch(kw)
  }
})

/* ---------- 历史记录 ---------- */

function loadHistory() {
  try {
    const raw = uni.getStorageSync(SEARCH_HISTORY_KEY)
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    history.value = Array.isArray(arr) ? arr.filter((h) => typeof h === 'string') : []
  } catch {
    history.value = []
  }
}

function saveHistory(kw: string) {
  const next = [kw, ...history.value.filter((h) => h !== kw)].slice(0, SEARCH_HISTORY_MAX)
  history.value = next
  try {
    uni.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* storage 写入失败忽略 */
  }
}

function removeHistory() {
  history.value = []
  try {
    uni.removeStorageSync(SEARCH_HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

function clearHistory() {
  uni.showModal({
    title: '清空搜索历史',
    content: '确定要清空全部搜索历史吗？',
    confirmColor: '#ff3a3a',
    success: (res) => {
      if (res.confirm) removeHistory()
    },
  })
}

/* ---------- 搜索 ---------- */

async function doSearch(kw?: string) {
  const word = (kw ?? keyword.value).trim()
  if (!word) {
    uni.showToast({ title: '请输入搜索内容', icon: 'none' })
    return
  }
  keyword.value = word
  searched.value = true
  searching.value = true
  artistView.value = null
  activeTab.value = 'songs'
  saveHistory(word)

  const result = await search(word)
  if (!artistView.value) {
    resultSongs.value = result?.songs ?? []
    resultArtists.value = result?.artists ?? []
    searching.value = false
  }
}

async function openArtist(artist: Artist) {
  artistView.value = artist
  artistSongs.value = []
  artistLoading.value = true
  artistSongs.value = await getArtistSongs(artist.id)
  artistLoading.value = false
}

function backToResult() {
  artistView.value = null
}

function playSong(song: Song, queue: Song[]) {
  player.play(song, queue)
  uni.navigateTo({ url: `/pages/player/player?id=${song.id}` })
}
</script>

<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <uni-icons type="search" size="20" color="#8a8a8e" />
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索歌曲 / 歌手"
          placeholder-class="placeholder"
          @confirm="doSearch()"
        />
        <uni-icons
          v-if="keyword"
          type="close"
          size="18"
          color="#8a8a8e"
          @click="keyword = ''"
        />
      </view>
      <view class="search-btn" @tap="doSearch()">搜索</view>
    </view>

    <!-- 搜索前：热词 + 历史 -->
    <view v-if="!searched" class="before-search">
      <view class="panel">
        <view class="panel-title">热门搜索</view>
        <view v-if="hotWords.length" class="hot-wrap">
          <view v-for="(h, i) in hotWords" :key="i" class="hot-chip" @tap="doSearch(h)">
            <text v-if="i < 3" class="hot-rank" :class="`top${i + 1}`">{{ i + 1 }}</text>
            <text>{{ h }}</text>
          </view>
        </view>
        <uni-load-more v-else status="loading" icon-size="18" :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }" />
      </view>

      <view v-if="history.length" class="panel">
        <view class="panel-title-row">
          <view class="panel-title">搜索历史</view>
          <uni-icons type="trash" size="20" color="#8a8a8e" @click="clearHistory" />
        </view>
        <view class="history-list">
          <view v-for="(h, i) in history" :key="i" class="history-item" @tap="doSearch(h)">
            <uni-icons type="undo" size="18" color="#5c5c60" />
            <text class="history-text">{{ h }}</text>
            <uni-icons type="forward" size="14" color="#5c5c60" />
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索后 -->
    <view v-else class="after-search">
      <!-- 歌手下钻：热门歌曲 -->
      <view v-if="artistView" class="artist-view">
        <view class="artist-head">
          <uni-icons type="back" size="22" color="#f5f5f7" @click="backToResult" />
          <image class="artist-avatar" :src="artistView.img1v1Url || artistView.picUrl" mode="aspectFill" />
          <view class="artist-info">
            <view class="artist-name">{{ artistView.name }}</view>
            <view v-if="artistView.alias?.length" class="artist-alias">{{ artistView.alias.join(' / ') }}</view>
          </view>
        </view>

        <uni-load-more v-if="artistLoading" status="loading" icon-size="20" :content-text="{ contentdown: '', contentrefresh: '加载中', contentnomore: '' }" />
        <view v-else-if="artistSongs.length" class="song-list">
          <view v-for="(s, i) in artistSongs" :key="s.id" class="song-item" @tap="playSong(s, artistSongs)">
            <view class="song-index" :class="{ active: state.current?.id === s.id }">{{ i + 1 }}</view>
            <view class="song-info">
              <view class="song-name" :class="{ active: state.current?.id === s.id }">{{ s.name }}</view>
              <view class="song-artist">{{ s.artists }}<text v-if="s.albumName"> - {{ s.albumName }}</text></view>
            </view>
            <view class="song-dt">{{ formatDurationMs(s.duration) }}</view>
          </view>
        </view>
        <view v-else class="empty-tip">没有该歌手的离线快照，请在 src/config.ts 配置 API_BASE</view>
      </view>

      <!-- 结果 Tab -->
      <view v-else>
        <view class="tabs">
          <view class="tab" :class="{ active: activeTab === 'songs' }" @tap="activeTab = 'songs'">单曲</view>
          <view class="tab" :class="{ active: activeTab === 'artists' }" @tap="activeTab = 'artists'">歌手</view>
        </view>

        <uni-load-more v-if="searching" status="loading" icon-size="20" :content-text="{ contentdown: '', contentrefresh: '搜索中', contentnomore: '' }" />

        <!-- 单曲 -->
        <view v-else-if="activeTab === 'songs'">
          <view v-if="resultSongs.length" class="song-list">
            <view v-for="(s, i) in resultSongs" :key="s.id" class="song-item" @tap="playSong(s, resultSongs)">
              <view class="song-index" :class="{ active: state.current?.id === s.id }">{{ i + 1 }}</view>
              <view class="song-info">
                <view class="song-name" :class="{ active: state.current?.id === s.id }">{{ s.name }}</view>
                <view class="song-artist">{{ s.artists }}<text v-if="s.albumName"> - {{ s.albumName }}</text></view>
              </view>
              <view class="song-dt">{{ formatDurationMs(s.duration) }}</view>
            </view>
          </view>
          <view v-else class="empty-tip">没有找到相关单曲</view>
        </view>

        <!-- 歌手 -->
        <view v-else-if="activeTab === 'artists'">
          <view v-if="resultArtists.length" class="artist-list">
            <view v-for="a in resultArtists" :key="a.id" class="artist-row" @tap="openArtist(a)">
              <image class="artist-row-avatar" :src="a.img1v1Url || a.picUrl" mode="aspectFill" />
              <view class="artist-row-info">
                <view class="artist-row-name">{{ a.name }}</view>
                <view v-if="a.alias?.length" class="artist-row-alias">{{ a.alias.join(' / ') }}</view>
              </view>
              <view class="artist-row-action">热门歌曲</view>
              <uni-icons type="forward" size="16" color="#8a8a8e" />
            </view>
          </view>
          <view v-else class="empty-tip">没有找到相关歌手</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 24rpx 24rpx 48rpx;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}
.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 76rpx;
  padding: 0 24rpx;
  border-radius: 38rpx;
  background: $uni-bg-card;
}
.search-input {
  flex: 1;
  min-width: 0;
  margin: 0 16rpx;
  font-size: 28rpx;
  color: $uni-text-main;
}
.placeholder {
  color: $uni-text-sub;
}
.search-btn {
  margin-left: 20rpx;
  font-size: 28rpx;
  color: $uni-primary;
}

/* 面板 */
.panel {
  margin-bottom: 32rpx;
}
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  margin-bottom: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: $uni-text-main;
}

/* 热词 */
.hot-wrap {
  display: flex;
  flex-wrap: wrap;
}
.hot-chip {
  display: flex;
  align-items: center;
  padding: 12rpx 26rpx;
  margin: 0 18rpx 18rpx 0;
  font-size: 26rpx;
  color: $uni-text-desc;
  background: $uni-bg-card;
  border-radius: 32rpx;
}
.hot-rank {
  margin-right: 10rpx;
  font-size: 22rpx;
  font-style: italic;
  color: $uni-text-sub;
  &.top1 {
    color: $uni-primary;
  }
  &.top2 {
    color: #ff8a3a;
  }
  &.top3 {
    color: #ffc53a;
  }
}

/* 历史 */
.history-list {
  background: $uni-bg-card;
  border-radius: $uni-radius;
  overflow: hidden;
}
.history-item {
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
.history-text {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
  font-size: 28rpx;
  color: $uni-text-desc;
  @include ellipsis(1);
}

/* Tab */
.tabs {
  display: flex;
  margin-bottom: 20rpx;
}
.tab {
  padding: 12rpx 0;
  margin-right: 44rpx;
  font-size: 30rpx;
  color: $uni-text-sub;
  border-bottom: 6rpx solid transparent;
  &.active {
    font-weight: 700;
    color: $uni-text-main;
    border-bottom-color: $uni-primary;
  }
}

/* 歌曲列表（同首页风格） */
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
  text-align: center;
  font-size: 30rpx;
  color: $uni-text-sub;
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

/* 歌手列表 */
.artist-list {
  background: $uni-bg-card;
  border-radius: $uni-radius;
  overflow: hidden;
}
.artist-row {
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
.artist-row-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $uni-bg-elevated;
  flex-shrink: 0;
}
.artist-row-info {
  flex: 1;
  min-width: 0;
  margin: 0 18rpx;
}
.artist-row-name {
  font-size: 30rpx;
  color: $uni-text-main;
  @include ellipsis(1);
}
.artist-row-alias {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
  @include ellipsis(1);
}
.artist-row-action {
  padding: 8rpx 20rpx;
  font-size: 20rpx;
  color: $uni-primary;
  border: 1rpx solid rgba(255, 58, 58, 0.5);
  border-radius: 26rpx;
}

/* 歌手下钻 */
.artist-head {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.artist-avatar {
  width: 104rpx;
  height: 104rpx;
  margin: 0 20rpx;
  border-radius: 50%;
  background: $uni-bg-elevated;
}
.artist-info {
  flex: 1;
  min-width: 0;
}
.artist-name {
  font-size: 34rpx;
  font-weight: 700;
  color: $uni-text-main;
}
.artist-alias {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $uni-text-sub;
}

.empty-tip {
  padding: 80rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  line-height: 40rpx;
  color: $uni-text-sub;
}
</style>
