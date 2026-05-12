<script setup lang="ts">
import type { BookingItem } from '../../services/bookingService'

defineProps<{
  loading: boolean
  bookings: BookingItem[]
  formatDate: (v?: string | null) => string
}>()

const emit = defineEmits<{
  (e: 'view-booking', b: BookingItem): void
}>()
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Applications</h1><p class="page-sub">{{ bookings.length }} pending tenant applications</p></div></div>
    <div class="panel">
      <table class="ptable full">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Room</th><th>Move-in</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
          <tr v-for="b in bookings" :key="b.id" style="cursor:pointer" @click="emit('view-booking', b)">
            <td class="td-name">{{ b.full_name }}</td><td class="td-muted">{{ b.email }}</td><td>{{ b.phone }}</td>
            <td>{{ b.room_number ?? b.room_id.slice(0,8) }}</td><td>{{ formatDate(b.desired_move_in_date) }}</td><td>{{ formatDate(b.created_at) }}</td>
            <td><button class="action-btn view" @click.stop="emit('view-booking', b)">View</button></td>
          </tr>
          <tr v-if="!loading && bookings.length === 0"><td colspan="7" class="td-muted">No pending applications.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
