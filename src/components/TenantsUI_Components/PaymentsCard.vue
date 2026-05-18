<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from './Card.vue'

const BaseCardComponent = BaseCard as any

export interface Payment {
  id: number
  rawId?: any
  label: any
  dueOrPaidDate: string
  amount: any
  status: 'Paid' | 'Unpaid' | string
  method?: any
  receiptNo?: any
}

const props = defineProps<{
  payments: Payment[]
  payLoading?: boolean
  // Optional lease used to render a fallback "Pay this month's rent" button
  // when there is no outstanding PENDING payment row to settle. Lets the
  // tenant proactively pay rent that hasn't been formally assigned yet.
  lease?: { monthly_rate?: number } | null
}>()

const emit = defineEmits<{
  payNow: [amount: number]
  viewAll: []
}>()

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank', GCASH: 'GCash',
  PAYMAYA: 'PayMaya', CARD: 'Card', PAYPAL: 'PayPal', OTHER: 'Other',
}

const pendingPayment = computed(() => props.payments.find(p => p.status === 'Unpaid'))

// What the "Pay rent" button should do when clicked:
//   - If there is a PENDING / Unpaid row, settle that one (its amount & label).
//   - Otherwise fall back to a proactive payment for the current month's rent
//     based on the lease's monthly_rate.
const payAction = computed<{ amount: number; label: string } | null>(() => {
  if (pendingPayment.value) {
    return {
      amount: Number(pendingPayment.value.amount) || 0,
      label:  String(pendingPayment.value.label ?? 'rent'),
    }
  }
  const rate = Number(props.lease?.monthly_rate ?? 0)
  if (!props.lease || rate <= 0) return null

  const monthYear = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  })
  return { amount: rate, label: `${monthYear} rent` }
})
</script>

<template>
  <BaseCardComponent title="Payments" link-text="View all" @link-click="emit('viewAll')">
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
        v-if="payAction"
        class="pay-btn"
        :disabled="payLoading"
        @click="emit('payNow', payAction.amount)"
      >
        {{ payLoading ? 'Redirecting to PayPal…' : `Pay ${payAction.label} — ${formatCurrency(payAction.amount)}` }}
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
  background: #ede9fe;
  color: #7c3aed;
}

.payment-icon--paid {
  background: #f3f4f6;
  color: #6b7280;
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