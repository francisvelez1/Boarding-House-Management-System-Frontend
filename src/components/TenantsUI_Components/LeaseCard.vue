<script setup lang="ts">
import BaseCard from './Card.vue'

interface LeaseDetails {
  room: string
  monthlyRent: number
  leaseStart: string  // e.g. 'Jan 1, 2026'
  leaseEnd: string    // e.g. 'Dec 31, 2026'
  monthsCompleted: number
  totalMonths: number
  status: 'Active' | 'Inactive' | 'Expired'
}

defineProps<{ lease: LeaseDetails }>()

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
</script>

<template>
  <BaseCard title="Lease details">
      <div class="lease-status-row">
        <span :class="['status-badge', `status-badge--${lease.status.toLowerCase()}`]">
          {{ lease.status }}
        </span>
      </div>

      <!-- Info Grid -->
      <div class="lease-grid">
        <div class="lease-field">
          <span class="lease-field__label">Room</span>
          <span class="lease-field__value">{{ lease.room }}</span>
        </div>
        <div class="lease-field">
          <span class="lease-field__label">Monthly rent</span>
          <span class="lease-field__value">{{ formatCurrency(lease.monthlyRent) }}</span>
        </div>
        <div class="lease-field">
          <span class="lease-field__label">Lease start</span>
          <span class="lease-field__value">{{ lease.leaseStart }}</span>
        </div>
        <div class="lease-field">
          <span class="lease-field__label">Lease end</span>
          <span class="lease-field__value">{{ lease.leaseEnd }}</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="lease-progress">
        <div class="lease-progress__dates">
          <span>{{ lease.leaseStart }}</span>
          <span class="lease-progress__label">
            {{ lease.monthsCompleted }} of {{ lease.totalMonths }} months completed
          </span>
          <span>{{ lease.leaseEnd }}</span>
        </div>
        <div class="lease-progress__bar-track">
          <div
            class="lease-progress__bar-fill"
            :style="{ width: `${(lease.monthsCompleted / lease.totalMonths) * 100}%` }"
          />
        </div>
      </div>
  </BaseCard>
</template>

<style scoped>
.lease-status-row {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

.status-badge--active {
  background: #e6f9f0;
  color: #1a8a52;
}

.status-badge--inactive {
  background: #f5f5f5;
  color: #888;
}

.status-badge--expired {
  background: #fff0f0;
  color: #c0392b;
}

.lease-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.lease-field {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lease-field__label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lease-field__value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.lease-progress {
  margin-top: 4px;
}

.lease-progress__dates {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
}

.lease-progress__label {
  color: #555;
  font-weight: 500;
}

.lease-progress__bar-track {
  height: 6px;
  background: #e8e8e8;
  border-radius: 99px;
  overflow: hidden;
}

.lease-progress__bar-fill {
  height: 100%;
  background: #4f6ef7;
  border-radius: 99px;
  transition: width 0.4s ease;
}
</style>