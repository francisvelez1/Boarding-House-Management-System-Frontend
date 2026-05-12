<script setup lang="ts">
defineProps<{
  loading: boolean
  dashboard: { rooms?: { total?: number; vacant?: number; occupied?: number } } | null
  filteredRooms: Array<{
    id: string; room_number: string; status: string
    current_occupants?: number; max_occupants?: number; monthly_rent?: number
  }>
  tenants: Array<{ id: string; room_id?: string; full_name: string }>
  approvedBookings: Array<{ id: string; room_id: string; full_name: string }>
  roomSearch: string
  formatMoney: (v?: number) => string
}>()

const emit = defineEmits<{
  (e: 'update:roomSearch', v: string): void
  (e: 'open-add-room'): void
  (e: 'set-vacant', id: string): void
  (e: 'set-maintenance', id: string): void
  (e: 'remove-room', id: string, roomNumber: string, status: string): void
}>()
</script>

<template>
  <div>
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Rooms</h1>
        <p class="page-sub">{{ dashboard?.rooms?.total ?? 0 }} total · {{ dashboard?.rooms?.vacant ?? 0 }} vacant · {{ dashboard?.rooms?.occupied ?? 0 }} occupied</p>
      </div>
      <div class="hdr-actions">
        <button class="btn-primary" @click="emit('open-add-room')">+ Add Room</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-hdr">
        <input :value="roomSearch" type="search" class="search-input" placeholder="Search by room number or status…" @input="emit('update:roomSearch', ($event.target as HTMLInputElement).value)">
      </div>
      <table class="ptable full">
        <thead><tr><th>Room #</th><th>Status</th><th>Reserved By</th><th>Occupants</th><th>Monthly Rent</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="td-muted">Loading…</td></tr>
          <tr v-for="r in filteredRooms" :key="r.id">
            <td class="td-name">{{ r.room_number }}</td>
            <td>
              <span class="badge" :class="r.status === 'VACANT' ? 'badge-paid' : r.status === 'OCCUPIED' ? 'badge-occupied' : r.status === 'MAINTENANCE' ? 'badge-partial' : 'badge-reserved'">
                {{ r.status }}
              </span>
            </td>
            <td class="td-muted">
              {{ (r.status === 'OCCUPIED' || r.status === 'RESERVED')
                ? (tenants.find(t => t.room_id === r.id)?.full_name ?? approvedBookings.find(b => b.room_id === r.id)?.full_name ?? '—')
                : '—' }}
            </td>
            <td>{{ r.current_occupants ?? 0 }} / {{ r.max_occupants ?? '—' }}</td>
            <td>{{ formatMoney(r.monthly_rent) }}</td>
            <td class="td-actions">
              <button v-if="r.status === 'MAINTENANCE' && (r.current_occupants ?? 0) === 0" class="action-btn approve" title="Mark room as Vacant" @click="emit('set-vacant', r.id)">Set Vacant</button>
              <button v-if="r.status === 'MAINTENANCE' && (r.current_occupants ?? 0) > 0" class="action-btn unassign" title="Unassign tenant and free room" @click="emit('remove-room', r.id, r.room_number, r.status)">Unassign & Vacate</button>
              <button v-if="r.status !== 'MAINTENANCE'" class="action-btn outline" title="Put room in Maintenance" @click="emit('set-maintenance', r.id)">Set Maintenance</button>
              <button
                class="action-btn"
                :class="(r.status === 'OCCUPIED' || r.status === 'RESERVED') ? 'unassign' : 'reject'"
                @click="emit('remove-room', r.id, r.room_number, r.status)"
              >
                {{ (r.status === 'OCCUPIED' || r.status === 'RESERVED') ? 'Unassign' : 'Remove' }}
              </button>
            </td>
          </tr>
          <tr v-if="!loading && filteredRooms.length === 0"><td colspan="6" class="td-muted">No rooms found.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
