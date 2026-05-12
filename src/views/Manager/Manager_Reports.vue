<script setup lang="ts">
import type { PaymentStats } from '../../services/managerService'

defineProps<{
  tenantStats: { total?: number; active?: number } | null
  dashboard: { rooms?: { occupancy_rate_pct?: number }; leases?: { active?: number }; maintenance?: { submitted?: number; in_progress?: number } } | null
  paymentStats: PaymentStats | null
  bookingsCount: number
  formatMoney: (v?: number) => string
  formatMoneyShort: (v?: number) => string
}>()
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Reports</h1><p class="page-sub">Occupancy, revenue, and operational summary</p></div></div>
    <div class="stats-grid mini">
      <div class="mini-stat"><span>Total tenants</span><strong>{{ tenantStats?.total ?? 0 }}</strong></div>
      <div class="mini-stat"><span>Active tenants</span><strong>{{ tenantStats?.active ?? 0 }}</strong></div>
      <div class="mini-stat"><span>Occupancy rate</span><strong>{{ Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) }}%</strong></div>
      <div class="mini-stat"><span>Active leases</span><strong>{{ dashboard?.leases?.active ?? 0 }}</strong></div>
      <div class="mini-stat"><span>Monthly revenue</span><strong>{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</strong></div>
      <div class="mini-stat"><span>Outstanding balance</span><strong class="danger">{{ formatMoney(paymentStats?.total_outstanding) }}</strong></div>
      <div class="mini-stat"><span>Maintenance open</span><strong>{{ (dashboard?.maintenance?.submitted ?? 0) + (dashboard?.maintenance?.in_progress ?? 0) }}</strong></div>
      <div class="mini-stat"><span>Pending applications</span><strong>{{ bookingsCount }}</strong></div>
    </div>
  </div>
</template>
