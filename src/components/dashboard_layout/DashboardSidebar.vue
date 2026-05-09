<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  activeSection: string
  sidebarOpen: boolean
  username?: string
  variant?: 'admin' | 'manager'
  badges?: Record<string, number>
}>(), {
  variant: 'admin',
  badges: () => ({}),
})

const emit = defineEmits<{
  (e: 'navigate', section: string): void
  (e: 'logout'): void
  (e: 'update:sidebarOpen', val: boolean): void
}>()

type NavItem = { key: string; label: string; icon: string; badge?: number }

const adminGroups: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' }] },
  {
    section: 'Access control',
    items: [
      { key: 'users', label: 'User accounts', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6m3-3h-6', badge: 3 },
      { key: 'manager-requests', label: 'Manager Requests', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
      { key: 'roles', label: 'Roles & permissions', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    ],
  },
  { section: 'Monitoring', items: [{ key: 'audit', label: 'Audit logs', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8' }, { key: 'health', label: 'System health', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' }] },
  { section: 'Settings', items: [{ key: 'settings', label: 'System settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }] },
]

const managerGroups: { section: string; items: NavItem[] }[] = [
  {
    section: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
      { key: 'tenants',   label: 'Tenants',   icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
      { key: 'rooms',     label: 'Rooms',     icon: 'M3 21h18M5 21V7l8-4 8 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01' },
      { key: 'leases',    label: 'Leases',    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { key: 'payments', label: 'Payments',  icon: 'M2 7h20M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' },
      { key: 'reports',  label: 'Reports',   icon: 'M18 20V10M12 20V4M6 20v-6' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { key: 'maintenance', label: 'Maintenance', icon: 'M14.7 6.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-2-2a1 1 0 0 1 1.4-1.4L7 12.6l6.3-6.3a1 1 0 0 1 1.4 0z' },
      { key: 'messages',    label: 'Messages',    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
      { key: 'bookings',    label: 'Applications', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6m3-3h-6' },
    ],
  },
]

const navGroups = computed(() => (props.variant === 'manager' ? managerGroups : adminGroups))
const roleTag = computed(() => (props.variant === 'manager' ? 'MANAGER' : 'ADMIN'))
const initials = (name?: string) => (name ? name.slice(0, 2).toUpperCase() : 'AD')
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <transition name="fade-text">
        <div v-if="sidebarOpen" class="logo-text-wrap">
          <span class="logo-name">ResidEase</span>
          <span class="logo-badge">{{ roleTag }}</span>
        </div>
      </transition>
    </div>

    <nav class="sidebar-nav">
      <template v-for="group in navGroups" :key="group.section">
        <div v-if="sidebarOpen" class="nav-section-label">{{ group.section }}</div>
        <div v-else class="nav-section-divider" />
        <button
          v-for="item in group.items"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeSection === item.key }"
          :title="!sidebarOpen ? item.label : ''"
          @click="emit('navigate', item.key)"
        >
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path :d="item.icon" />
          </svg>
          <transition name="fade-text">
            <span v-if="sidebarOpen" class="nav-label-wrap">
              <span class="nav-label">{{ item.label }}</span>
              <span v-if="(props.badges[item.key] ?? item.badge) != null && (props.badges[item.key] ?? item.badge)! > 0" class="nav-badge">{{ props.badges[item.key] ?? item.badge }}</span>
            </span>
          </transition>
        </button>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="admin-profile">
        <div class="admin-avatar">{{ initials(username) }}</div>
        <transition name="fade-text">
          <div v-if="sidebarOpen" class="admin-meta">
            <span class="admin-name">{{ username ?? roleTag }}</span>
            <span class="admin-role-tag">{{ roleTag }}</span>
          </div>
        </transition>
      </div>
      <transition name="fade-text">
        <button v-if="sidebarOpen" class="logout-btn" title="Logout" @click="emit('logout')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </transition>
    </div>
  </aside>
</template>

<style scoped>
.sidebar { width: 224px; min-width: 224px; background: #160d27; display: flex; flex-direction: column; transition: width .25s ease, min-width .25s ease; overflow: hidden; flex-shrink: 0; position: relative; z-index: 10; }
.sidebar.collapsed { width: 60px; min-width: 60px; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 18px 14px 16px; border-bottom: 1px solid rgba(255,255,255,.06); flex-shrink: 0; }
.logo-icon { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg,#ae68fa,#f1966e); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.logo-text-wrap { display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; }
.logo-name { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: .02em; }
.logo-badge { font-size: 9px; padding: 2px 6px; background: #dc2626; color: #fff; border-radius: 4px; font-weight: 700; letter-spacing: .05em; }
.sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; overflow-x: hidden; }
.nav-section-label { font-size: 9px; color: rgba(255,255,255,.25); text-transform: uppercase; letter-spacing: .1em; padding: 12px 8px 4px; white-space: nowrap; }
.nav-section-divider { height: 1px; background: rgba(255,255,255,.06); margin: 8px 4px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,.45); font-size: 13px; font-family: inherit; cursor: pointer; transition: background .15s, color .15s; white-space: nowrap; width: 100%; text-align: left; }
.nav-item:hover { background: rgba(174,104,250,.12); color: rgba(255,255,255,.8); }
.nav-item.active { background: linear-gradient(90deg,rgba(174,104,250,.25),rgba(241,150,110,.18)); color: #fff; border-left: 2.5px solid #ae68fa; }
.nav-icon { flex-shrink: 0; }
.nav-label-wrap { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 1; min-width: 0; }
.nav-label { font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
.nav-badge { font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #dc2626; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sidebar-footer { padding: 12px 10px; border-top: 1px solid rgba(255,255,255,.06); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.admin-profile { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }
.admin-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#ae68fa,#f1966e); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.admin-meta { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.admin-name { font-size: 12px; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-role-tag { font-size: 9px; font-weight: 700; color: #fca5a5; letter-spacing: .06em; }
.logout-btn { background: none; border: none; color: rgba(255,255,255,.3); cursor: pointer; padding: 5px; border-radius: 7px; display: flex; align-items: center; transition: color .15s, background .15s; flex-shrink: 0; }
.logout-btn:hover { color: #ef4444; background: rgba(239,68,68,.12); }
.fade-text-enter-active, .fade-text-leave-active { transition: opacity .15s; }
.fade-text-enter-from, .fade-text-leave-to { opacity: 0; }
</style>
