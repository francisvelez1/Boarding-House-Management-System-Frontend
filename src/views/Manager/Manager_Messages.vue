<script setup lang="ts">
import type { NotificationItem } from '../../services/notificationService'

defineProps<{
  loading: boolean
  notifications: NotificationItem[]
  activityDotClass: (type: string) => string
  timeAgo: (value: string) => string
}>()
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Messages</h1><p class="page-sub">Notifications and system activity</p></div></div>
    <div class="panel">
      <div class="activity-list full">
        <div v-if="loading" class="td-muted">Loading…</div>
        <div v-for="n in notifications" :key="n.id" class="activity-item">
          <span class="activity-dot" :class="activityDotClass(n.notification_type)"></span>
          <div class="activity-body"><p class="activity-text"><strong>{{ n.title }}</strong> — {{ n.message }}</p><span class="activity-time">{{ timeAgo(n.created_at) }} · {{ n.notification_type }}</span></div>
        </div>
        <div v-if="!loading && notifications.length === 0" class="td-muted">No notifications.</div>
      </div>
    </div>
  </div>
</template>
