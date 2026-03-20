import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import GuestPage    from '../components/GuestPage.vue'
import LoginForm    from '../components/LoginForm.vue'
import RegisterForm from '../components/RegisterForm.vue'
import HomePage     from '../components/HomePage.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Updated the Path for Guest para siya first makita
    { path: '/',         name: 'Guest',    component: GuestPage }, 
    { path: '/login',    name: 'Login',    component: LoginForm,    meta: { guest: true } },
    { path: '/register', name: 'Register', component: RegisterForm, meta: { guest: true } },
    { path: '/home',     name: 'Home',     component: HomePage,     meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return next({ name: 'Login' })
  if (to.meta.guest      && auth.isAuthenticated)    return next({ name: 'Home' })
  next()
})

export default router