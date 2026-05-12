<script setup lang="ts">
import type { ManagerLease } from '../../services/managerService'

defineProps<{
  loading: boolean
  dashboard: { leases?: { active?: number; expiring_soon?: number } } | null
  leases: ManagerLease[]
  formatDate: (v?: string | null) => string
  formatMoney: (v?: number) => string
}>()
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Leases</h1><p class="page-sub">{{ dashboard?.leases?.active ?? 0 }} active · {{ dashboard?.leases?.expiring_soon ?? 0 }} expiring soon</p></div></div>
    <div class="panel">
      <table class="ptable full">
        <thead><tr><th>ID</th><th>Tenant</th><th>Room</th><th>Status</th><th>Start</th><th>End</th><th>Rent</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
          <tr v-for="l in leases" :key="l.id">
            <td class="td-muted">{{ l.id.slice(0, 8) }}…</td><td>{{ l.tenant_id.slice(0, 8) }}</td><td>{{ l.room_id.slice(0, 8) }}</td>
            <td><span class="badge" :class="l.status === 'ACTIVE' ? 'badge-paid' : l.status === 'PENDING' ? 'badge-pending' : 'badge-unpaid'">{{ l.status }}</span></td>
            <td>{{ formatDate(l.start_date) }}</td><td>{{ formatDate(l.end_date) }}</td><td>{{ formatMoney(l.monthly_rent) }}</td>
          </tr>
          <tr v-if="!loading && leases.length === 0"><td colspan="7" class="td-muted">No leases found.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
