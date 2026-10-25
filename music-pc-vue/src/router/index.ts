import { createRouter, createWebHashHistory } from 'vue-router';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    { path: '/rank', component: () => import('../views/Rank.vue') },
    { path: '/search', component: () => import('../views/Search.vue') },
    { path: '/playlist/:id', component: () => import('../views/Playlist.vue') },
  ],
});
