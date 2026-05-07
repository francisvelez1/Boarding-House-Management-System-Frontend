import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public Routes ──
    {
      path: '/',
      name: 'Guest',
      component: () => import('../views/auth/GuestPage.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/auth/google/callback',
      name: 'GoogleCallback',
      component: () => import('../views/auth/GoogleCallbackView.vue'),
      meta: { requiresAuth: false },
    },

    // ── Protected Routes ──
    {
      path: '/home',
      name: 'Home',
      component: () => import('../views/auth/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('../views/auth/AdminPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },

    {
      path: '/tenant/dashboard',
      name: 'TenantPage',
      component: () => import('../views/auth/TenantPage.vue'),
      meta: { requiresAuth: true, requiresTenant: true },
    },
    {
      path: '/manager',
      name: 'Manager',
      component: () => import('../views/auth/ManagerPage.vue'),
      meta: { requiresAuth: true, requiresManager: true },
    },

    // ── Fallback ──
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// ── Navigation Guard ──────────────────────────────────────────────────────────
router.beforeEach((to) => {
  const auth       = useAuthStore()
  const userRole   = auth.user?.role ?? ''
  const isLoggedIn = auth.isAuthenticated
 
  const isAdmin  = userRole === 'ROLE_ADMIN'
  const isTenant = userRole === 'ROLE_TENANT'
  const isManager = userRole === 'ROLE_MANAGER'

  if (to.path === '/tenant/dashboard' && isTenant) return true
  if (to.path === '/admin'            && isAdmin)  return true
  if (to.path === '/manager'          && isManager) return true   

  // 1. Redirect logged-in users away from guest page based on their role
    if (isLoggedIn && to.path === '/') {
    if (isTenant)  return { path: '/tenant/dashboard' }
    if (isAdmin)   return { path: '/admin' }
    if (isManager) return { path: '/manager' }
    return { path: '/home' }
  }

  // 2. Unauthenticated → guest page
  if (to.meta.requiresAuth && !isLoggedIn) return { path: '/' }

  // 3. Role-based access control
  if (to.meta.requiresAdmin && !isAdmin) {
    return isManager ? { path: '/manager' } : { path: '/home' }
  }

  if (to.meta.requiresManager && !(isAdmin || isManager)) {
    return { path: '/home' }
  }

  if (to.meta.requiresTenant && !isTenant) {
    return isAdmin ? { path: '/admin' } : { path: '/home' }
  }

  return true
})

export default router