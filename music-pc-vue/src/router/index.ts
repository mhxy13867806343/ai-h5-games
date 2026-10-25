import { createRouter, createWebHashHistory } from 'vue-router';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    { path: '/rank', component: () => import('../views/Rank.vue') },
    { path: '/search', component: () => import('../views/Search.vue') },
    { path: '/playlist/:id', component: () => import('../views/Playlist.vue') },
    { path: '/artists', component: () => import('../views/Artists.vue') },
    { path: '/artist/:id', component: () => import('../views/ArtistDetail.vue') },
    { path: '/mv', component: () => import('../views/MV.vue') },
    { path: '/recommend', component: () => import('../views/Recommend.vue') },
    { path: '/playlist-cat', component: () => import('../views/PlaylistCat.vue') },
  ],
});
