<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/Logo.png'

const router = useRouter()
const auth   = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="page">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-brand">
        <img :src="logo" alt="ResidEase" class="brand-logo" />
        <span class="brand-text">Boarding House Management System</span>
      </div>
      <div class="topbar-right">
        <div class="avatar">{{ auth.user?.username?.[0]?.toUpperCase() }}</div>
        <span class="username">{{ auth.user?.username }}</span>
        <button class="logout-btn" @click="logout">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="content">
      <!-- Welcome card -->
      <div class="welcome-card">
        <div class="welcome-icon">🏠</div>
        <h1>Welcome back, <span class="highlight">{{ auth.user?.username }}</span>!</h1>
        <p>You're logged in to the Boarding House Management System.</p>
      </div>

      <!-- Quick nav cards -->
      <div class="quick-grid">
        <div class="quick-card" v-for="item in quickLinks" :key="item.label">
          <div class="quick-icon" :style="{ background: item.bg }">{{ item.icon }}</div>
          <div>
            <p class="quick-label">{{ item.label }}</p>
            <p class="quick-desc">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
const quickLinks = [
  { icon: '👥', label: 'Tenants',     desc: 'Manage tenant records',    bg: '#ede9fe' },
  { icon: '🚪', label: 'Rooms',       desc: 'View room availability',   bg: '#dbeafe' },
  { icon: '📄', label: 'Leases',      desc: 'Active lease agreements',  bg: '#dcfce7' },
  { icon: '💳', label: 'Payments',    desc: 'Track rent payments',      bg: '#fef9c3' },
  { icon: '🔧', label: 'Maintenance', desc: 'Maintenance requests',     bg: '#ffedd5' },
  { icon: '📊', label: 'Reports',     desc: 'Financial reports',        bg: '#fce7f3' },
]
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7ff;
}

/* Topbar */
.topbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e8e4f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-brand { display:flex; align-items:center; gap:10px; }
.brand-logo   { width:32px; height:32px; }
.brand-text   { font-weight:600; font-size:16px; color:#1f2933; }

.topbar-right { display:flex; align-items:center; gap:12px; }
.avatar {
  width:34px; height:34px;
  background: linear-gradient(135deg,#ae68fa,#f1966e);
  color:#fff; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  font-weight:700; font-size:14px;
}
.username { font-size:14px; font-weight:600; color:#374151; }

.logout-btn {
  display:flex; align-items:center; gap:6px;
  padding:8px 16px; border-radius:10px; border:none;
  background:#fee2e2; color:#dc2626;
  font-size:13px; font-weight:600; cursor:pointer;
  transition:background .15s;
}
.logout-btn:hover { background:#fecaca; }

/* Content */
.content {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Welcome card */
.welcome-card {
  background: #fff;
  border-radius: 24px;
  padding: 40px 48px;
  border: 1px solid rgba(210,196,255,.6);
  box-shadow: 0 8px 32px rgba(149,132,226,.15);
  text-align: center;
}
.welcome-icon { font-size: 48px; margin-bottom: 12px; }
.welcome-card h1 { font-size:26px; font-weight:700; color:#111827; margin-bottom:8px; }
.welcome-card p  { font-size:15px; color:#6b7280; }
.highlight { background:linear-gradient(90deg,#ae68fa,#f1966e); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

/* Quick grid */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.quick-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e8e4f5;
  box-shadow: 0 2px 10px rgba(124,58,237,.05);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
}
.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124,58,237,.12);
}
.quick-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.quick-label { font-size:15px; font-weight:600; color:#111827; }
.quick-desc  { font-size:13px; color:#6b7280; margin-top:2px; }

@media (max-width:640px) {
  .topbar { padding:0 16px; }
  .brand-text { display:none; }
  .content { padding:24px 16px; }
  .welcome-card { padding:28px 20px; }
  .quick-grid { grid-template-columns: 1fr; }
}
</style>