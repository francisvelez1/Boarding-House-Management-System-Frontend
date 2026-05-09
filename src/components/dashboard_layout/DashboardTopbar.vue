<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { notificationService, type NotificationItem } from '../../services/notificationService'

const props = withDefaults(defineProps<{
  activeSection: string
  username?: string
  notifCount?: number
  variant?: 'admin' | 'manager'
}>(), {
  variant: 'admin',
})

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'open-notifs'): void
  (e: 'export-logs'): void
}>()

const pageTitle = computed(() => {
  const adminLabels: Record<string, string> = {
    dashboard: 'Admin dashboard',
    users: 'User accounts',
    roles: 'Roles & permissions',
    audit: 'Audit logs',
    health: 'System health',
    settings: 'System settings',
  }
  const managerLabels: Record<string, string> = {
    dashboard:   'Manager dashboard',
    tenants:     'Tenants',
    rooms:       'Room operations',
    leases:      'Lease management',
    payments:    'Payment tracking',
    reports:     'Reports',
    maintenance: 'Maintenance queue',
    messages:    'Messages',
    bookings:    'Tenant applications',
  }
  const labels = props.variant === 'manager' ? managerLabels : adminLabels
  return labels[props.activeSection] ?? (props.variant === 'manager' ? 'Manager' : 'Admin')
})

const showAction = computed(() => props.variant === 'admin' && (props.activeSection === 'dashboard' || props.activeSection === 'users'))
const roleTag = computed(() => (props.variant === 'manager' ? 'MANAGER' : 'ADMIN'))
const initials = (name?: string) => (name ? name.slice(0, 2).toUpperCase() : 'AD')

const isNotifOpen = ref(false)
const notifLoading = ref(false)
const notifError = ref('')
const unreadCount = ref(props.notifCount ?? 0)
const notifications = ref<NotificationItem[]>([])

const effectiveNotifCount = computed(() => unreadCount.value)

function formatTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

async function refreshBadge() {
  try {
    unreadCount.value = await notificationService.getUnreadCount()
  } catch {
    unreadCount.value = props.notifCount ?? 0
  }
}

async function openNotifications() {
  emit('open-notifs')
  isNotifOpen.value = !isNotifOpen.value
  if (!isNotifOpen.value) return

  notifLoading.value = true
  notifError.value = ''
  try {
    const [list, count] = await Promise.all([
      notificationService.getUnread(20),
      notificationService.getUnreadCount(),
    ])
    notifications.value = list
    unreadCount.value = count
  } catch (e: any) {
    notifError.value = e?.message ?? 'Failed to load notifications.'
  } finally {
    notifLoading.value = false
  }
}

async function markOneAsRead(id: string) {
  try {
    await notificationService.markAsRead(id)
    notifications.value = notifications.value.filter((n) => n.id !== id)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (e: any) {
    notifError.value = e?.message ?? 'Unable to mark as read.'
  }
}

async function markAllRead() {
  try {
    await notificationService.markAllAsRead()
    notifications.value = []
    unreadCount.value = 0
  } catch (e: any) {
    notifError.value = e?.message ?? 'Unable to mark all as read.'
  }
}

onMounted(() => {
  void refreshBadge()
})
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
      <button v-if="showAction" type="button" class="btn-text" @click="emit('export-logs')">Export logs</button>
      <button class="icon-action" title="Notifications" @click="openNotifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span v-if="effectiveNotifCount > 0" class="notif-badge">{{ effectiveNotifCount }}</span>
      </button>

      <div class="user-chip">
        <div class="chip-avatar">{{ initials(username) }}</div>
        <div class="chip-meta">
          <span class="chip-name">{{ username ?? roleTag }}</span>
          <span class="chip-role">{{ roleTag }}</span>
        </div>
      </div>
    </div>

    <div v-if="isNotifOpen" class="notif-panel">
      <div class="notif-panel-hdr">
        <strong>Notifications</strong>
        <button class="notif-clear-btn" :disabled="notifications.length === 0" @click="markAllRead">Mark all read</button>
      </div>
      <div v-if="notifLoading" class="notif-state">Loading...</div>
      <div v-else-if="notifError" class="notif-state err">{{ notifError }}</div>
      <div v-else-if="notifications.length === 0" class="notif-state">No unread notifications.</div>
      <ul v-else class="notif-list">
        <li v-for="n in notifications" :key="n.id" class="notif-item">
          <div class="notif-body">
            <p class="notif-title">{{ n.title }}</p>
            <p class="notif-msg">{{ n.message }}</p>
            <span class="notif-time">{{ formatTime(n.created_at) }}</span>
          </div>
          <button class="notif-read-btn" @click="markOneAsRead(n.id)">Read</button>
        </li>
      </ul>
    </div>
  </header>
</template>

<style scoped>
.topbar { height: 54px; background: #fff; border-bottom: 1px solid #e0ddf7; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; flex-shrink: 0; box-shadow: 0 1px 6px rgba(149,132,226,.07); position: relative; z-index: 5; }
.topbar-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.icon-btn { width: 34px; height: 34px; border-radius: 9px; background: none; border: 1px solid transparent; color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s, border-color .15s; flex-shrink: 0; }
.icon-btn:hover { background: rgba(174,104,250,.08); color: #ae68fa; border-color: rgba(174,104,250,.2); }
.page-heading { margin: 0; font-size: 17px; font-weight: 700; color: #160d27; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topbar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.btn-text { background: none; border: none; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; font-family: inherit; padding: 6px 4px; }
.btn-text:hover { color: #ae68fa; }
.icon-action { width: 34px; height: 34px; border-radius: 9px; background: #faf7ff; border: 1px solid #e0ddf7; color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; transition: border-color .15s, color .15s; }
.icon-action:hover { border-color: #ae68fa; color: #ae68fa; }
.notif-badge { position: absolute; top: 5px; right: 5px; min-width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg,#ae68fa,#f1966e); color: #fff; font-size: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 1.5px solid #fff; padding: 0 3px; }
.user-chip { display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; border: 1px solid #e0ddf7; border-radius: 999px; background: #faf7ff; }
.chip-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg,#ae68fa,#f1966e); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; }
.chip-meta { display: flex; flex-direction: column; line-height: 1.2; }
.chip-name { font-size: 12px; color: #160d27; font-weight: 600; }
.chip-role { font-size: 10px; color: #ae68fa; font-weight: 600; }
.notif-panel { position: absolute; top: 56px; right: 18px; width: 320px; max-height: 360px; overflow-y: auto; background: #fff; border: 1px solid #e0ddf7; border-radius: 12px; box-shadow: 0 10px 28px rgba(22,13,39,.14); padding: 10px; z-index: 20; }
.notif-panel-hdr { display: flex; justify-content: space-between; align-items: center; padding: 4px 2px 8px; border-bottom: 1px solid #f3f0fb; margin-bottom: 8px; }
.notif-clear-btn { border: none; background: transparent; color: #ae68fa; font-size: 12px; cursor: pointer; }
.notif-clear-btn:disabled { color: #c4b8e8; cursor: not-allowed; }
.notif-state { color: #6b7280; font-size: 12px; padding: 10px 4px; }
.notif-state.err { color: #b91c1c; }
.notif-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.notif-item { border: 1px solid #f3f0fb; border-radius: 10px; padding: 8px; display: flex; gap: 8px; justify-content: space-between; }
.notif-body { min-width: 0; }
.notif-title { margin: 0; font-size: 12px; font-weight: 700; color: #160d27; }
.notif-msg { margin: 3px 0; font-size: 12px; color: #6b7280; }
.notif-time { font-size: 11px; color: #9ca3af; }
.notif-read-btn { border: 1px solid #e0ddf7; background: #faf7ff; border-radius: 8px; height: 28px; align-self: center; padding: 0 8px; font-size: 12px; color: #6b7280; cursor: pointer; }
@media (max-width: 768px) { .btn-text { display: none; } .chip-meta { display: none; } }
</style>
