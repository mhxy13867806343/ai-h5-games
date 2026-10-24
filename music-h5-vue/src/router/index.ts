import { createRouter, createWebHashHistory } from 'vue-router';

export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/Home.vue') },
    { path: '/rank', name: 'rank', component: () => import('../views/Rank.vue') },
    { path: '/search', name: 'search', component: () => import('../views/Search.vue') },
    { path: '/playlist/:id', name: 'playlist', component: () => import('../views/Playlist.vue') },
    { path: '/player', name: 'player', component: () => import('../views/Player.vue') },
  ],
});
