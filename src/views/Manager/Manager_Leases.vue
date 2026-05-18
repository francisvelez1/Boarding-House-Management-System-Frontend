<script setup lang="ts">
import type { ManagerLease } from '../../services/managerService'

const props = defineProps<{
  loading: boolean
  dashboard: { leases?: { active?: number; expiring_soon?: number } } | null
  leases: ManagerLease[]
  tenants: { id: string; full_name?: string }[]
  rooms?: { id: string; room_number: string }[]
  formatDate: (v?: string | null) => string
  formatMoney: (v?: number) => string
}>()

const emit = defineEmits<{
  (e: 'assign-payment', lease: ManagerLease): void
  (e: 'delete-lease', leaseId: string): void
}>()

function tenantName(tenantId: string): string {
  const t = props.tenants.find(t => t.id === tenantId)
  // When the tenant can't be resolved (e.g. it belongs to a room another
  // manager owns, or has been deleted) show a clean placeholder instead
  // of a sliced ObjectId, which users were reading as a "hash".
  return t?.full_name ?? '—'
}

function roomLabel(roomId: string): string {
  const r = props.rooms?.find(r => r.id === roomId)
  // Same rationale as `tenantName` — never leak the raw ObjectId into
  // the UI. Show the room number when known, otherwise a placeholder.
  return r?.room_number ? `Room ${r.room_number}` : '—'
}
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Leases</h1><p class="page-sub">{{ dashboard?.leases?.active ?? 0 }} active · {{ dashboard?.leases?.expiring_soon ?? 0 }} expiring soon</p></div></div>
    <div class="panel">
      <table class="ptable full">
        <thead><tr><th>ID</th><th>Tenant</th><th>Room</th><th>Status</th><th>Start</th><th>End</th><th>Rent</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="td-muted">Loading…</td></tr>
          <tr v-for="l in leases" :key="l.id">
            <td class="td-muted">{{ l.id.slice(0, 8) }}…</td>
            <td class="td-name">{{ tenantName(l.tenant_id) }}</td>
            <td>{{ roomLabel(l.room_id) }}</td>
            <td><span class="badge" :class="l.status === 'ACTIVE' ? 'badge-paid' : l.status === 'PENDING' ? 'badge-pending' : 'badge-unpaid'">{{ l.status }}</span></td>
            <td>{{ formatDate(l.start_date) }}</td><td>{{ formatDate(l.end_date) }}</td><td>{{ formatMoney(l.monthly_rent) }}</td>
            <td class="td-actions">
              <button v-if="l.status === 'ACTIVE'" class="action-btn confirm" @click="emit('assign-payment', l)">
                + Assign Payment
              </button>
              <button v-if="l.status === 'TERMINATED' || l.status === 'EXPIRED' || l.status === 'CANCELLED'" class="action-btn reject" @click="emit('delete-lease', l.id)">
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="!loading && leases.length === 0"><td colspan="8" class="td-muted">No leases found.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
