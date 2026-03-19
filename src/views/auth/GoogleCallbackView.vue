<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

onMounted(() => {
  const access_token  = route.query.access_token  as string
  const refresh_token = route.query.refresh_token as string
  const username      = route.query.username      as string

  if (access_token && username) {
    auth.login({ username, access_token, refresh_token })
    router.replace('/home')
  } else {
    router.replace('/login?error=google_failed')
  }
})
</script>

<template>
  <div class="callback-page">
    <div class="spinner"></div>
    <p>Signing you in with Google…</p>
  </div>
</template>

<style scoped>
.callback-page {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  background:#faf7ff; gap:16px; font-size:15px; color:#6b7280;
}
.spinner {
  width:40px; height:40px;
  border:4px solid #e0ddf7; border-top-color:#ae68fa;
  border-radius:50%; animation:spin .8s linear infinite;
}
@keyframes spin { to { transform:rotate(360deg); } }
</style>