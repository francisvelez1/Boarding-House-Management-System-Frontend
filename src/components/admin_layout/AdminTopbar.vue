<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activeSection: string
  username?: string
  notifCount?: number
}>()

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'open-notifs'): void
  (e: 'export-logs'): void
}>()

const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    dashboard: 'Admin dashboard',
    users: 'User accounts',
    roles: 'Roles & permissions',
    audit: 'Audit logs',
    health: 'System health',
    settings: 'System settings',
  }
  return labels[props.activeSection] ?? 'Admin'
})

const showAdminActions = computed(() => props.activeSection === 'dashboard' || props.activeSection === 'users')

const initials = (name?: string) => (name ? name.slice(0, 2).toUpperCase() : 'AD')
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="icon-btn" title="Toggle sidebar" @click="emit('toggle-sidebar')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <h1 class="page-heading">{{ pageTitle }}</h1>
    </div>

    <div class="topbar-right">
      <template v-if="showAdminActions">
        <button type="button" class="btn-text" @click="emit('export-logs')">Export logs</button>
      </template>

      <button class="icon-action" title="Notifications" @click="emit('open-notifs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span v-if="(notifCount ?? 0) > 0" class="notif-badge">{{ notifCount }}</span>
      </button>

      <div class="user-chip">
        <div class="chip-avatar">{{ initials(username) }}</div>
        <div class="chip-meta">
          <span class="chip-name">{{ username ?? 'Admin' }}</span>
          <span class="chip-role">ADMIN</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4b8e8" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 54px;
  background: #fff;
  border-bottom: 1px solid #e0ddf7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  flex-shrink: 0;
  box-shadow: 0 1px 6px rgba(149, 132, 226, 0.07);
  position: relative;
  z-index: 5;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: none;
  border: 1px solid transparent;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  flex-shrink: 0;
}
.icon-btn:hover {
  background: rgba(174, 104, 250, 0.08);
  color: #ae68fa;
  border-color: rgba(174, 104, 250, 0.2);
}

.page-heading {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #160d27;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.btn-text {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  padding: 6px 4px;
}
.btn-text:hover {
  color: #ae68fa;
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 9px;
  border: none;
  background: #160d27;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-primary:hover {
  opacity: 0.9;
}

.icon-action {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #faf7ff;
  border: 1px solid #e0ddf7;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.icon-action:hover {
  border-color: #ae68fa;
  color: #ae68fa;
}

.notif-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  padding: 0 3px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 5px;
  border: 1px solid #e0ddf7;
  border-radius: 999px;
  background: #faf7ff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.user-chip:hover {
  border-color: #ae68fa;
  box-shadow: 0 0 0 3px rgba(174, 104, 250, 0.1);
}

.chip-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
}
.chip-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.chip-name {
  font-size: 12px;
  color: #160d27;
  font-weight: 600;
}
.chip-role {
  font-size: 10px;
  color: #ae68fa;
  font-weight: 600;
}

@media (max-width: 768px) {
  .btn-text,
  .btn-primary {
    display: none;
  }
  .chip-meta {
    display: none;
  }
}
</style>
