<script setup lang="ts">
import type { PaymentStats } from '../../services/managerService'

defineProps<{
  loading: boolean
  payments: Array<{
    id: string; tenant_id: string; amount: number; type?: string
    method: string; receipt_number?: string; status: string; payment_date: string
  }>
  paymentStats: PaymentStats | null
  tenants: Array<{ id: string; full_name: string }>
  formatMoney: (v?: number) => string
  formatMoneyShort: (v?: number) => string
  formatDate: (v?: string | null) => string
  paymentBadgeClass: (status: string) => string
}>()

// No emits — the Payments tab is now read-only.
// Managers create charges from the Leases tab via "+ Assign Payment";
// tenants settle them from their own dashboard.
</script>

<template>
  <div>
    <div class="page-hdr">
      <div><h1 class="page-title">Payments</h1><p class="page-sub">{{ paymentStats?.paid_count ?? 0 }} paid · {{ paymentStats?.unpaid_count ?? 0 }} unpaid · {{ paymentStats?.partial_count ?? 0 }} partial</p></div>
    </div>
    <div class="stats-grid mini">
      <div class="mini-stat"><span>Total collected</span><strong>{{ formatMoney(paymentStats?.total_collected) }}</strong></div>
      <div class="mini-stat"><span>Outstanding</span><strong class="danger">{{ formatMoney(paymentStats?.total_outstanding) }}</strong></div>
      <div class="mini-stat"><span>Monthly revenue</span><strong>{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</strong></div>
      <div class="mini-stat"><span>Unpaid count</span><strong class="danger">{{ paymentStats?.unpaid_count ?? 0 }}</strong></div>
    </div>
    <div class="panel">
      <table class="ptable full">
        <thead><tr><th>Tenant</th><th>Amount</th><th>Type</th><th>Method</th><th>Receipt</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
          <tr v-for="p in payments" :key="p.id">
            <td class="td-name">{{ tenants.find(t => t.id === p.tenant_id)?.full_name ?? '—' }}</td>
            <td class="td-amt">{{ formatMoney(p.amount) }}</td><td>{{ p.type }}</td><td>{{ p.method }}</td>
            <td class="td-muted" style="font-size:11px">{{ p.receipt_number ?? '—' }}</td>
            <td><span class="badge" :class="paymentBadgeClass(p.status)">{{ p.status }}</span></td>
            <td>{{ formatDate(p.payment_date) }}</td>
          </tr>
          <tr v-if="!loading && payments.length === 0"><td colspan="7" class="td-muted">No payments found.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
