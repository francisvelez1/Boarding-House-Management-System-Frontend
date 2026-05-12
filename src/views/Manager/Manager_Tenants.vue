<script setup lang="ts">
defineProps<{
  loading: boolean
  tenantStats: { total?: number; active?: number; pending?: number } | null
  reservedCount: number
  allTenantsDisplay: Array<{
    id: string; full_name: string; email: string; phone: string
    room_number?: string; room_id?: string; status: string
    outstanding_balance: number; created_at: string; is_reserved: boolean
  }>
  tenantSearch: string
  formatMoney: (v?: number) => string
  formatDate: (v?: string | null) => string
}>()

const emit = defineEmits<{
  (e: 'update:tenantSearch', v: string): void
  (e: 'confirm-tenant', id: string, name: string): void
  (e: 'unassign-tenant', id: string, name: string): void
}>()
</script>

<template>
  <div>
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Tenants</h1>
        <p class="page-sub">{{ tenantStats?.active ?? 0 }} active · {{ tenantStats?.pending ?? 0 }} pending · {{ reservedCount }} reserved</p>
      </div>
    </div>
    <div class="panel">
      <div class="panel-hdr">
        <input :value="tenantSearch" type="search" class="search-input" placeholder="Search by name, email, or phone…" @input="emit('update:tenantSearch', ($event.target as HTMLInputElement).value)">
      </div>
      <table class="ptable full">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Room</th><th>Status</th><th>Balance</th><th>Since</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="td-muted">Loading…</td></tr>
          <tr v-for="t in allTenantsDisplay" :key="t.id + (t.is_reserved ? '-r' : '')">
            <td class="td-name">{{ t.full_name }}</td>
            <td class="td-muted">{{ t.email }}</td>
            <td>{{ t.phone }}</td>
            <td>{{ t.room_number ?? (t.room_id ? t.room_id.slice(0,8) : '—') }}</td>
            <td>
              <span v-if="t.is_reserved" class="badge badge-reserved">Reserved</span>
              <span v-else class="badge" :class="t.status === 'ACTIVE' ? 'badge-paid' : t.status === 'PENDING' ? 'badge-pending' : 'badge-unpaid'">{{ t.status }}</span>
            </td>
            <td :class="t.outstanding_balance > 0 ? 'td-danger' : ''">{{ formatMoney(t.outstanding_balance) }}</td>
            <td class="td-muted">{{ formatDate(t.created_at) }}</td>
            <td class="td-actions">
              <button v-if="t.is_reserved" class="action-btn confirm" title="Confirm tenant as occupant" @click="emit('confirm-tenant', t.id, t.full_name)">
                ✓ Confirm
              </button>
              <button v-else class="action-btn unassign" title="Unassign tenant — frees room and removes records" @click="emit('unassign-tenant', t.id, t.full_name)">
                Unassign
              </button>
            </td>
          </tr>
          <tr v-if="!loading && allTenantsDisplay.length === 0"><td colspan="8" class="td-muted">No tenants found.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
