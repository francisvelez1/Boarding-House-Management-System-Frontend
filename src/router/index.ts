import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public Routes ──
    { 
      path: '/login',    
      name: 'Login',    
      component: () => import('../views/auth/LoginView.vue'), // Path: views/auth/
      meta: { requiresAuth: false } 
    },
    { 
      path: '/register', 
      name: 'Register', 
      component: () => import('../views/auth/RegisterView.vue'), // Path: views/auth/
      meta: { requiresAuth: false } 
    },
    { 
      path: '/auth/google/callback', 
      name: 'GoogleCallback',
      component: () => import('../views/auth/GoogleCallbackView.vue'), // Path: views/auth/
      meta: { requiresAuth: false } 
    },

    // ── Protected Routes ──
    { 
      path: '/home', 
      name: 'Home', 
      component: () => import('../views/auth/HomePage.vue'), // Path: views/auth/
      meta: { requiresAuth: true } 
    },

    // ── Fallbacks ──
    { path: '/', redirect: '/home' },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

// Navigation Guard
router.beforeEach((to) => {
  const auth = useAuthStore()
  const isLoggedIn = !!auth.isAuthenticated

  // Redirect to login if page requires auth and user is not logged in
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { path: '/login' }
  }

  // Prevent logged-in users from seeing login/register pages
  if (isLoggedIn && (to.path === '/login' || to.path === '/register')) {
    return { path: '/home' }
  }
})

export default router