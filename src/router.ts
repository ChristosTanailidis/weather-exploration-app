import { createRouter, createWebHistory } from 'vue-router'

/**
 * Single route: the explorer. The router is only used for query state
 * (view, place, layer, time), so every other path falls back to it.
 */
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'explore',
      component: () => import('@/views/ExploreView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: to => ({ path: '/', query: to.query }),
    },
  ],
})
