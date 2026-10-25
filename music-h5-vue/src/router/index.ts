import { createRouter, createWebHashHistory } from 'vue-router';

export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Home.vue') },
    { path: '/rank', name: 'rank', component: () => import('../views/Rank.vue') },
    { path: '/search', name: 'search', component: () => import('../views/Search.vue') },
    { path: '/playlist/:id', name: 'playlist', component: () => import('../views/Playlist.vue') },
    { path: '/player', name: 'player', component: () => import('../views/Player.vue') },
    { path: '/artists', name: 'artists', component: () => import('../views/Artists.vue') },
    { path: '/artist/:id', name: 'artist', component: () => import('../views/ArtistDetail.vue') },
    { path: '/mv', name: 'mv', component: () => import('../views/MV.vue') },
    { path: '/recommend', name: 'recommend', component: () => import('../views/Recommend.vue') },
    { path: '/playlist-cat', name: 'playlistcat', component: () => import('../views/PlaylistCat.vue') },
  ],
});
