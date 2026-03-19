// ============================================================
//  ResidEase — main.ts  (Vue app entry point)
// ============================================================

import { createApp }    from 'vue'
import { createPinia }  from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import Toast            from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App    from './App.vue'
import router from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  },
})

createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .use(Toast, { position: 'top-right', timeout: 3000 })
  .mount('#app')
