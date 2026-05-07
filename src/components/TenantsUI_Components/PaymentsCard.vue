<script setup lang="ts">
import BaseCard from './Card.vue'

const BaseCardComponent = BaseCard as any

export interface Payment {
  id: number
  label: string        // e.g. 'April 2026 rent'
  dueOrPaidDate: string // e.g. 'Due Apr 5, 2026' or 'Paid Mar 3, 2026'
  amount: number
  status: 'Paid' | 'Unpaid'
}

const props = defineProps<{
  payments: Payment[]
  unpaidAmount?: number  // if there is a current unpaid amount for the CTA button
}>()

const emit = defineEmits<{
  payNow: [amount: number]
}>()

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
}

const pendingPayment = props.payments.find(p => p.status === 'Unpaid')
</script>

<template>
  <BaseCardComponent title="Payments" link-text="View all" link-href="#">
    <div
      v-for="payment in payments"
      :key="payment.id"
      class="payment-item"
    >
      <!-- Icon -->
      <div :class="['payment-icon', `payment-icon--${payment.status.toLowerCase()}`]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      </div>

      <!-- Label + Date -->
      <div class="payment-info">
        <span class="payment-info__label">{{ payment.label }}</span>
        <span class="payment-info__date">{{ payment.dueOrPaidDate }}</span>
      </div>

      <!-- Amount + Status -->
      <div class="payment-right">
        <span :class="['payment-amount', payment.status === 'Unpaid' ? 'payment-amount--unpaid' : '']">
          {{ formatCurrency(payment.amount) }}
        </span>
        <span :class="['payment-status', `payment-status--${payment.status.toLowerCase()}`]">
          {{ payment.status }}
        </span>
      </div>
    </div>

    <template #footer>
      <button
        v-if="pendingPayment"
        class="pay-btn"
        @click="emit('payNow', pendingPayment.amount)"
      >
        Pay {{ pendingPayment.label }} — {{ formatCurrency(pendingPayment.amount) }}
      </button>
    </template>
  </BaseCardComponent>
</template>

<style scoped>
.payment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.payment-item:last-child {
  border-bottom: none;
}

.payment-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.payment-icon--unpaid {
  background: #fff0f0;
  color: #e74c3c;
}

.payment-icon--paid {
  background: #e6f9f0;
  color: #1a8a52;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-info__label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.payment-info__date {
  font-size: 12px;
  color: #999;
}

.payment-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.payment-amount {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.payment-amount--unpaid {
  color: #e74c3c;
}

.payment-status {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}

.payment-status--paid {
  background: #e6f9f0;
  color: #1a8a52;
}

.payment-status--unpaid {
  background: #fff0f0;
  color: #e74c3c;
}

.pay-btn {
  width: 100%;
  padding: 12px;
  background: #1a1a2e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.pay-btn:hover {
  background: #2d2d4e;
}
</style>