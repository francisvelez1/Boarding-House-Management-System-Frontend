<script setup lang="ts">
import LeaseCard from '../../components/TenantsUI_Components/LeaseCard.vue'
import PaymentsCard from '../../components/TenantsUI_Components/PaymentsCard.vue'
import MaintenanceCard from '../../components/TenantsUI_Components/MaintenanceCard.vue'
import MessagesCard from '../../components/TenantsUI_Components/MessageCard.vue'

defineProps<{
  tenant: any
  room: any
  username: string
  greeting: string
  leaseForCard: any
  lease: any
  paymentsForCard: any[]
  payNowLoading: boolean
  maintenanceForCard: any[]
  messagesForCard: any[]
  floorShort: (fl: string) => string
}>()

const emit = defineEmits<{
  (e: 'pay-now', amount: number): void
  (e: 'open-pay-modal', amount: number): void
  (e: 'submit-maintenance'): void
  (e: 'open-message', id: number): void
  (e: 'scroll-to', section: string): void
}>()
</script>

<template>
  <div v-show="true" id="my-room">
    <header class="hero-dash hero-dash--light">
      <div class="hero-dash__left">
        <h1>{{ greeting }}, {{ tenant?.first_name ?? tenant?.full_name?.split(' ')[0] ?? username }}!</h1>
        <p>Here's your boarding house overview for today.</p>
      </div>
      <div class="hero-dash__stats">
        <div class="hero-dash__stat">
          <span class="stat-label">Your room</span>
          <!--
            Prefer the denormalized `tenant.room_number` (returned by
            `/api/tenants/me`) so the hero stat is correct as soon as the
            tenant profile loads, *without* waiting on the secondary
            `getRoom()` call. The full `room` object is still used as a
            fallback in case an older backend doesn't denormalize.
          -->
          <span class="stat-value stat-value--purple">{{ tenant?.room_number ?? room?.room_number ?? '—' }}</span>
        </div>
        <div class="hero-dash__stat">
          <span class="stat-label">Floor</span>
          <span class="stat-value stat-value--purple">{{
            tenant?.floor_level
              ? floorShort(tenant.floor_level)
              : (room?.floor_level ? floorShort(room.floor_level) : '—')
          }}</span>
        </div>
        <div class="hero-dash__stat">
          <span class="stat-label">Status</span>
          <span class="stat-value stat-value--green">{{ tenant?.status === 'ACTIVE' ? 'Active' : (tenant?.status ?? 'Active') }} ✓</span>
        </div>
      </div>
    </header>
    <main class="content">
      <section class="my-room-grid">
        <!-- Lease details -->
        <div class="my-room-col">
          <LeaseCard v-if="leaseForCard" :lease="leaseForCard" />
          <div v-else class="empty-card">
            <div class="empty-card__header">
              <span class="empty-card__title">Lease details</span>
            </div>
            <p class="empty-card__msg">No lease information found.</p>
          </div>
        </div>
        <!-- Payments -->
        <div class="my-room-col">
          <PaymentsCard v-if="paymentsForCard.length" :payments="paymentsForCard" :pay-loading="payNowLoading" :lease="lease" @pay-now="emit('pay-now', $event)" @view-all="emit('scroll-to', 'payments')" />
          <div v-else class="empty-card">
            <div class="empty-card__header">
              <span class="empty-card__title">Payments</span>
              <span class="empty-card__viewall" @click="emit('scroll-to', 'payments')">View all</span>
            </div>
            <p class="empty-card__msg">No payment records.</p>
            <button v-if="lease" class="btn-pay-rent" @click="emit('open-pay-modal', lease.monthly_rate ?? 0)">
              Pay {{ new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }} rent — ₱{{ (lease.monthly_rate ?? 0).toLocaleString() }}
            </button>
          </div>
        </div>
        <!-- Maintenance -->
        <div class="my-room-col">
          <MaintenanceCard :requests="maintenanceForCard" @submit-new="emit('submit-maintenance')" @view-all="emit('scroll-to', 'maintenance')" />
        </div>
      </section>
      <!-- Messages full width -->
      <section class="section--full">
        <MessagesCard v-if="messagesForCard.length" :messages="messagesForCard" @open-message="emit('open-message', $event)" @view-all="emit('scroll-to', 'messages')" />
        <div v-else class="empty-card">
          <div class="empty-card__header">
            <span class="empty-card__title">Messages from management</span>
            <span class="empty-card__viewall" @click="emit('scroll-to', 'messages')">View all</span>
          </div>
          <p class="empty-card__msg">No messages yet.</p>
        </div>
      </section>
    </main>
  </div>
</template>