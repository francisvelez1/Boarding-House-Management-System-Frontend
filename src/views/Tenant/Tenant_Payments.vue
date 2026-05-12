<script setup lang="ts">
import PaymentsCard from '../../components/TenantsUI_Components/PaymentsCard.vue'

defineProps<{
  paymentsForCard: any[]
  payNowLoading: boolean
  lease: any
}>()

const emit = defineEmits<{
  (e: 'pay-now', amount: number): void
  (e: 'open-pay-modal', amount: number): void
  (e: 'scroll-to', section: string): void
}>()
</script>

<template>
  <div v-show="true" id="payments">
    <main class="content">
      <section class="section--full">
        <PaymentsCard v-if="paymentsForCard.length" :payments="paymentsForCard" :pay-loading="payNowLoading" @pay-now="emit('pay-now', $event)" @view-all="emit('scroll-to', 'payments')" />
        <div v-else class="empty-card">
          <div class="empty-card__header">
            <span class="empty-card__title">Payments</span>
          </div>
          <p class="empty-card__msg">No payment records yet.</p>
          <button v-if="lease" class="btn-pay-rent" @click="emit('open-pay-modal', lease.monthly_rate ?? 0)">
            Pay {{ new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }} rent — ₱{{ (lease.monthly_rate ?? 0).toLocaleString() }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>