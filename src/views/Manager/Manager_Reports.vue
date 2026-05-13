<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { PaymentStats, AnalyticsData } from '../../services/managerService'
import { managerService } from '../../services/managerService'

defineProps<{
  tenantStats: { total?: number; active?: number } | null
  dashboard: { rooms?: { occupancy_rate_pct?: number }; leases?: { active?: number }; maintenance?: { submitted?: number; in_progress?: number } } | null
  paymentStats: PaymentStats | null
  bookingsCount: number
  formatMoney: (v?: number) => string
  formatMoneyShort: (v?: number) => string
}>()

const analytics = ref<AnalyticsData | null>(null)
const loadingAnalytics = ref(false)

onMounted(async () => {
  loadingAnalytics.value = true
  try {
    analytics.value = await managerService.getAnalytics()
  } catch { /* silent */ }
  loadingAnalytics.value = false
})

const maxRevenue = computed(() => {
  if (!analytics.value?.monthly_revenue?.length) return 1
  return Math.max(...analytics.value.monthly_revenue.map(m => m.revenue), 1)
})
</script>

<template>
  <div>
    <div class="page-hdr"><div><h1 class="page-title">Reports &amp; Analytics</h1><p class="page-sub">Occupancy, revenue, and operational summary</p></div></div>

    <!-- Quick stats -->
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

    <div v-if="loadingAnalytics" class="loading-bar" style="margin-top:16px">Loading analytics…</div>

    <template v-if="analytics">
      <!-- Revenue chart + Collection rate -->
      <div class="panels-row" style="margin-top:18px">
        <div class="panel" style="grid-column: span 2">
          <div class="panel-hdr"><span class="panel-title">Revenue (Last 6 Months)</span></div>
          <div class="rpt-chart">
            <div v-for="m in analytics.monthly_revenue" :key="m.month" class="rpt-bar-col">
              <div class="rpt-bar-value">{{ formatMoneyShort(m.revenue) }}</div>
              <div class="rpt-bar" :style="{ height: Math.max((m.revenue / maxRevenue) * 140, 4) + 'px' }"></div>
              <div class="rpt-bar-label">{{ m.month.split(' ')[0] }}</div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-hdr"><span class="panel-title">Collection Rate</span></div>
          <div class="rpt-donut-wrap">
            <svg viewBox="0 0 36 36" class="rpt-donut">
              <path class="rpt-donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e0ddf7" stroke-width="3"/>
              <path class="rpt-donut-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ae68fa" stroke-width="3" :stroke-dasharray="`${analytics.collection_rate}, 100`"/>
            </svg>
            <div class="rpt-donut-label">{{ analytics.collection_rate }}%</div>
          </div>
          <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:8px">Payments confirmed vs total</p>
        </div>
      </div>

      <!-- Occupancy donut + Top rooms -->
      <div class="panels-row" style="margin-top:14px">
        <div class="panel">
          <div class="panel-hdr"><span class="panel-title">Occupancy</span></div>
          <div class="rpt-donut-wrap">
            <svg viewBox="0 0 36 36" class="rpt-donut">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e0ddf7" stroke-width="3"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" stroke-width="3" :stroke-dasharray="`${analytics.occupancy.rate_pct}, 100`"/>
            </svg>
            <div class="rpt-donut-label">{{ analytics.occupancy.rate_pct }}%</div>
          </div>
          <div style="display:flex;justify-content:center;gap:16px;margin-top:10px;font-size:12px;color:#6b7280">
            <span><strong style="color:#22c55e">{{ analytics.occupancy.occupied }}</strong> Occupied</span>
            <span><strong style="color:#9ca3af">{{ analytics.occupancy.vacant }}</strong> Vacant</span>
          </div>
        </div>
        <div class="panel" style="grid-column: span 2">
          <div class="panel-hdr"><span class="panel-title">Top Earning Rooms</span></div>
          <table class="ptable full">
            <thead><tr><th>Room</th><th>Total Earned</th></tr></thead>
            <tbody>
              <tr v-for="r in analytics.top_rooms" :key="r.room_id">
                <td class="td-name">{{ r.room_number }}</td>
                <td class="td-amt">{{ formatMoney(r.total_earned) }}</td>
              </tr>
              <tr v-if="analytics.top_rooms.length === 0"><td colspan="2" class="td-muted">No payment data.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Outstanding tenants -->
      <div class="panel" style="margin-top:14px" v-if="analytics.outstanding_tenants.length > 0">
        <div class="panel-hdr"><span class="panel-title">Outstanding Balances</span></div>
        <table class="ptable full">
          <thead><tr><th>Tenant</th><th>Room</th><th>Monthly Rate</th><th>Outstanding</th></tr></thead>
          <tbody>
            <tr v-for="t in analytics.outstanding_tenants" :key="t.tenant_id">
              <td class="td-name">{{ t.tenant_name }}</td>
              <td>{{ t.room_number }}</td>
              <td>{{ formatMoney(t.monthly_rate) }}</td>
              <td class="td-danger">{{ formatMoney(t.outstanding_balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="panel" style="margin-top:14px">
        <div class="panel-hdr"><span class="panel-title">Summary</span></div>
        <div class="stats-grid mini">
          <div class="mini-stat"><span>Total rooms</span><strong>{{ analytics.summary.total_rooms }}</strong></div>
          <div class="mini-stat"><span>Active leases</span><strong>{{ analytics.summary.active_leases }}</strong></div>
          <div class="mini-stat"><span>Total payments</span><strong>{{ analytics.summary.total_payments }}</strong></div>
          <div class="mini-stat"><span>Total collected</span><strong>{{ formatMoney(analytics.summary.total_collected) }}</strong></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rpt-chart { display: flex; align-items: flex-end; gap: 12px; padding: 10px 0; min-height: 180px; }
.rpt-bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
.rpt-bar { width: 100%; max-width: 48px; background: linear-gradient(180deg, #ae68fa 0%, #f1966e 100%); border-radius: 6px 6px 0 0; transition: height 0.4s ease; }
.rpt-bar-value { font-size: 11px; font-weight: 700; color: #160d27; }
.rpt-bar-label { font-size: 11px; color: #9ca3af; font-weight: 600; }
.rpt-donut-wrap { position: relative; width: 120px; height: 120px; margin: 10px auto 0; }
.rpt-donut { width: 100%; height: 100%; transform: rotate(-90deg); }
.rpt-donut-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #160d27; }
</style>
