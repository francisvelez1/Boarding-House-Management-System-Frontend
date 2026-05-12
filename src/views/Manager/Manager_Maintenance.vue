<script setup lang="ts">
import type { ManagerMaintenance } from '../../services/managerService'

defineProps<{
  loading: boolean
  dashboard: { maintenance?: { submitted?: number; in_progress?: number; completed?: number } } | null
  maintenance: ManagerMaintenance[]
  formatDate: (v?: string | null) => string
  maintenanceBadgeClass: (status: string) => string
}>()

const emit = defineEmits<{
  (e: 'update-status', id: string, action: 'start' | 'complete' | 'close'): void
}>()
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Maintenance</h1><p class="page-sub">{{ dashboard?.maintenance?.submitted ?? 0 }} submitted · {{ dashboard?.maintenance?.in_progress ?? 0 }} in progress · {{ dashboard?.maintenance?.completed ?? 0 }} completed</p></div></div>
    <div class="panel">
      <table class="ptable full">
        <thead><tr><th>Title</th><th>Description</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="td-muted">Loading…</td></tr>
          <tr v-for="m in maintenance" :key="m.id">
            <td class="td-name">{{ m.title }}</td>
            <td class="td-muted">{{ m.description ? m.description.slice(0, 50) + (m.description.length > 50 ? '…' : '') : '—' }}</td>
            <td><span class="badge" :class="m.priority === 'HIGH' || m.priority === 'URGENT' ? 'badge-unpaid' : m.priority === 'MEDIUM' ? 'badge-partial' : 'badge-assigned'">{{ m.priority }}</span></td>
            <td><span class="badge" :class="maintenanceBadgeClass(m.status)">{{ m.status.replace('_', ' ') }}</span></td>
            <td>{{ formatDate(m.created_at) }}</td>
            <td>
              <button v-if="m.status === 'SUBMITTED' || m.status === 'ASSIGNED'" class="action-btn approve" @click="emit('update-status', m.id, 'start')">Start</button>
              <button v-if="m.status === 'IN_PROGRESS'" class="action-btn approve" @click="emit('update-status', m.id, 'complete')">Complete</button>
              <button v-if="m.status === 'COMPLETED'" class="action-btn outline" @click="emit('update-status', m.id, 'close')">Close</button>
            </td>
          </tr>
          <tr v-if="!loading && maintenance.length === 0"><td colspan="6" class="td-muted">No maintenance requests.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
