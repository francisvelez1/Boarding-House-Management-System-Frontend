<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import DashboardSidebar from '@/components/dashboard_layout/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard_layout/DashboardTopbar.vue'
import {
  managerService,
  type ManagerDashboardPayload,
  type ManagerLease,
  type ManagerMaintenance,
  type ManagerPayment,
  type ManagerRoom,
  type PaymentStats,
} from '../../services/managerService'
import { bookingService, type BookingItem } from '../../services/bookingService'
import { tenantService, roomService, type TenantResponse, type TenantStats, type RoomCreateRequest, type RoomType, type FloorLevel } from '../../services/domainServices'
import { notificationService, type NotificationItem } from '../../services/notificationService'

type Section = 'dashboard' | 'tenants' | 'rooms' | 'leases' | 'payments' | 'reports' | 'maintenance' | 'messages' | 'bookings'

const router   = useRouter()
const auth     = useAuthStore()

const sidebarOpen   = ref(true)
const activeSection = ref<Section>('dashboard')
const loading       = ref(false)
const error         = ref('')

const dashboard      = ref<ManagerDashboardPayload | null>(null)
const rooms          = ref<ManagerRoom[]>([])
const leases         = ref<ManagerLease[]>([])
const payments       = ref<ManagerPayment[]>([])
const maintenance    = ref<ManagerMaintenance[]>([])
const bookings       = ref<BookingItem[]>([])
const tenants        = ref<TenantResponse[]>([])
const tenantStats    = ref<TenantStats | null>(null)
const paymentStats   = ref<PaymentStats | null>(null)
const notifications  = ref<NotificationItem[]>([])

const tenantSearch   = ref('')
const roomSearch     = ref('')

const showAddRoomModal = ref(false)
const roomFormLoading  = ref(false)
const roomFormError    = ref('')
const roomForm = ref<RoomCreateRequest>({
  room_number:         '',
  floor_level:         undefined,
  room_type:           'SINGLE',
  description:         '',
  max_occupants:       1,
  monthly_rate:        0,
  deposit_multiplier:  2,
  advance_multiplier:  1,
  dimension:           { length_sqm: undefined, width_sqm: undefined },
  amenities:           [],
})
const amenityInput = ref('')
const amenityList  = ref<{ name: string; is_working: boolean }[]>([])

const floorLevels: FloorLevel[]  = ['GROUND', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH']
const roomTypes:   RoomType[]    = ['SINGLE', 'DOUBLE', 'STUDIO', 'DORMITORY', 'SUITE']

function openAddRoom() {
  roomForm.value = {
    room_number:        '',
    floor_level:        undefined,
    room_type:          'SINGLE',
    description:        '',
    max_occupants:      1,
    monthly_rate:       0,
    deposit_multiplier: 2,
    advance_multiplier: 1,
    dimension:          { length_sqm: undefined, width_sqm: undefined },
    amenities:          [],
  }
  amenityInput.value = ''
  amenityList.value   = []
  roomFormError.value = ''
  showAddRoomModal.value = true
}

function addAmenity() {
  const name = amenityInput.value.trim()
  if (!name) return
  amenityList.value.push({ name, is_working: true })
  amenityInput.value = ''
}

function removeAmenity(index: number) {
  amenityList.value.splice(index, 1)
}

async function submitAddRoom() {
  if (!roomForm.value.room_number.trim()) { roomFormError.value = 'Room number is required.'; return }
  if (!roomForm.value.monthly_rate || roomForm.value.monthly_rate <= 0) { roomFormError.value = 'Monthly rate must be greater than 0.'; return }
  roomFormLoading.value = true
  roomFormError.value   = ''
  try {
    const payload: RoomCreateRequest = {
      ...roomForm.value,
      room_number:  roomForm.value.room_number.trim(),
      description:  roomForm.value.description?.trim() || undefined,
      amenities:    amenityList.value.length > 0 ? [...amenityList.value] : undefined,
      dimension:    (roomForm.value.dimension?.length_sqm || roomForm.value.dimension?.width_sqm)
                      ? roomForm.value.dimension : undefined,
    }
    await roomService.create(payload)
    showAddRoomModal.value = false
    await loadManagerData()
  } catch (e: any) {
    roomFormError.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to create room.'
  } finally {
    roomFormLoading.value = false
  }
}

async function removeRoom(id: string, roomNumber: string) {
  if (!window.confirm(`Remove room ${roomNumber}? This cannot be undone.`)) return
  try {
    await roomService.deleteRoom(id)
    await loadManagerData()
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 403) {
      error.value = `Only admins can permanently delete rooms. Use "Set Maintenance" to deactivate room ${roomNumber}.`
    } else {
      error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to remove room.'
    }
  }
}

async function setRoomMaintenance(id: string) {
  try {
    await roomService.updateStatus(id, 'MAINTENANCE')
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to update room status.'
  }
}

async function setRoomVacant(id: string) {
  try {
    await roomService.updateStatus(id, 'VACANT')
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to set room as vacant.'
  }
}

const filteredTenants = computed(() =>
  tenantSearch.value
    ? tenants.value.filter(t =>
        t.full_name.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
        t.email.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
        t.phone.includes(tenantSearch.value))
    : tenants.value
)

const filteredRooms = computed(() =>
  roomSearch.value
    ? rooms.value.filter(r => r.room_number.toLowerCase().includes(roomSearch.value.toLowerCase()) || r.status.toLowerCase().includes(roomSearch.value.toLowerCase()))
    : rooms.value
)

const sidebarBadges = computed<Record<string, number>>(() => ({
  tenants:     tenantStats.value?.total ?? 0,
  payments:    paymentStats.value?.unpaid_count ?? 0,
  maintenance: (dashboard.value?.maintenance?.submitted ?? 0) + (dashboard.value?.maintenance?.in_progress ?? 0),
}))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const todayLabel = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })
})

function navigate(section: string) {
  if (['dashboard','tenants','rooms','leases','payments','reports','maintenance','messages','bookings'].includes(section)) {
    activeSection.value = section as Section
  }
}

function logout() {
  auth.logout()
  router.push('/')
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-PH')
}

function formatMoney(value?: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value ?? 0)
}

function formatMoneyShort(value?: number) {
  const v = value ?? 0
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `₱${Math.round(v / 1_000)}k`
  return `₱${v}`
}

function timeAgo(value: string) {
  const d    = new Date(value)
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function paymentBadgeClass(status: string) {
  if (status === 'PAID' || status === 'CONFIRMED') return 'badge-paid'
  if (status === 'PARTIAL') return 'badge-partial'
  return 'badge-unpaid'
}

function maintenanceBadgeClass(status: string) {
  if (status === 'IN_PROGRESS') return 'badge-inprogress'
  if (status === 'ASSIGNED') return 'badge-assigned'
  if (status === 'COMPLETED' || status === 'CLOSED') return 'badge-done'
  return 'badge-pending'
}

function activityDotClass(type: string) {
  if (type.includes('payment') || type.includes('PAYMENT')) return 'dot-blue'
  if (type.includes('maintenance') || type.includes('MAINTENANCE')) return 'dot-orange'
  if (type.includes('lease') || type.includes('LEASE')) return 'dot-red'
  return 'dot-green'
}

async function loadManagerData() {
  loading.value = true
  error.value   = ''
  try {
    const [dashRes, roomsRes, leasesRes, paymentsRes, maintRes, bookingsRes, statsRes, notifRes] = await Promise.allSettled([
      managerService.getDashboard(),
      managerService.listRooms(),
      managerService.listLeases(),
      managerService.listPayments(),
      managerService.listMaintenance(),
      bookingService.listAll({ status: 'PENDING', limit: 50 }),
      managerService.getPaymentStats(),
      notificationService.getUnread(10),
    ])

    if (dashRes.status === 'fulfilled')     dashboard.value     = dashRes.value
    if (roomsRes.status === 'fulfilled')    rooms.value         = roomsRes.value
    if (leasesRes.status === 'fulfilled')   leases.value        = leasesRes.value
    if (paymentsRes.status === 'fulfilled') payments.value      = paymentsRes.value
    if (maintRes.status === 'fulfilled')    maintenance.value   = maintRes.value
    if (bookingsRes.status === 'fulfilled') bookings.value      = bookingsRes.value.bookings ?? []
    if (statsRes.status === 'fulfilled')    paymentStats.value  = statsRes.value
    if (notifRes.status === 'fulfilled')    notifications.value = notifRes.value

    const [tListRes, tStatsRes] = await Promise.allSettled([
      tenantService.getAll({ limit: 100 }),
      tenantService.getStats(),
    ])
    if (tListRes.status === 'fulfilled')   tenants.value      = tListRes.value.data ?? []
    if (tStatsRes.status === 'fulfilled')  tenantStats.value  = tStatsRes.value.data ?? null

  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load manager dashboard.'
  } finally {
    loading.value = false
  }
}

async function approveBooking(id: string) {
  if (!window.confirm('Approve this booking?')) return
  try {
    await bookingService.review(id, { status: 'APPROVED', review_notes: 'Approved by manager' })
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to approve booking.'
  }
}

async function rejectBooking(id: string) {
  const reason = window.prompt('Reason for rejection:')
  if (reason === null) return
  try {
    await bookingService.review(id, { status: 'REJECTED', review_notes: reason || 'Rejected by manager' })
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to reject booking.'
  }
}

async function updateMaintenanceStatus(id: string, action: 'start' | 'complete' | 'close') {
  try {
    const base = `/api/manager/maintenance/${id}`
    await fetch(`${base}/${action}`, { method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}` } })
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to update maintenance.'
  }
}

onMounted(() => { void loadManagerData() })
</script>

<template>
  <div class="shell">
    <DashboardSidebar
      :active-section="activeSection"
      :sidebar-open="sidebarOpen"
      :username="auth.user?.username"
      :badges="sidebarBadges"
      variant="manager"
      @navigate="navigate"
      @logout="logout"
    />

    <div class="main-area">
      <DashboardTopbar
        :active-section="activeSection"
        :username="auth.user?.username"
        variant="manager"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
      />

      <main class="content">
        <div v-if="error" class="error-bar">{{ error }} <button @click="error = ''">✕</button></div>

        <!-- ════════════════════════ DASHBOARD ════════════════════════ -->
        <div v-if="activeSection === 'dashboard'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Dashboard</h1>
              <p class="page-sub">{{ todayLabel }} — {{ greeting }}, {{ auth.user?.username }}!</p>
            </div>
            <div class="hdr-actions">
              <button class="btn-outline" @click="loadManagerData">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
              <button class="btn-outline" @click="navigate('reports')">Export report</button>
              <button class="btn-primary" @click="navigate('tenants')">+ Add tenant</button>
            </div>
          </div>

          <div v-if="loading" class="loading-bar">Loading dashboard data…</div>

          <div class="stats-grid">
            <div class="stat-card sc-blue">
              <div class="sc-top">
                <span class="sc-label">Total tenants</span>
                <div class="sc-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
              </div>
              <div class="sc-value">{{ tenantStats?.total ?? 0 }}</div>
              <div class="sc-trend up">▲ {{ tenantStats?.active ?? 0 }} active</div>
              <div class="sc-sparkline"></div>
            </div>

            <div class="stat-card sc-teal">
              <div class="sc-top">
                <span class="sc-label">Occupied rooms</span>
                <div class="sc-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/></svg>
                </div>
              </div>
              <div class="sc-value">{{ dashboard?.rooms?.occupied ?? 0 }} <span class="sc-denom">/ {{ dashboard?.rooms?.total ?? 0 }}</span></div>
              <div class="sc-trend neutral">{{ Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) }}% occupancy</div>
              <div class="sc-sparkline"></div>
            </div>

            <div class="stat-card sc-yellow">
              <div class="sc-top">
                <span class="sc-label">Monthly revenue</span>
                <div class="sc-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
              </div>
              <div class="sc-value">{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</div>
              <div class="sc-trend up">▲ total collected</div>
              <div class="sc-sparkline"></div>
            </div>

            <div class="stat-card sc-red">
              <div class="sc-top">
                <span class="sc-label">Unpaid rent</span>
                <div class="sc-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
              </div>
              <div class="sc-value">{{ paymentStats?.unpaid_count ?? 0 }}</div>
              <div class="sc-trend down">▼ overdue tenants</div>
              <div class="sc-sparkline"></div>
            </div>
          </div>

          <div class="panels-row">
            <!-- Recent payments -->
            <div class="panel">
              <div class="panel-hdr">
                <span class="panel-title">Recent payments</span>
                <button class="panel-link" @click="navigate('payments')">View all</button>
              </div>
              <table class="ptable">
                <thead><tr><th>Tenant</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  <tr v-if="loading"><td colspan="3" class="td-muted">Loading…</td></tr>
                  <tr v-for="p in payments.slice(0, 5)" :key="p.id">
                    <td class="td-name">{{ p.tenant_id.slice(0, 8) }}</td>
                    <td class="td-amt">{{ formatMoney(p.amount) }}</td>
                    <td><span class="badge" :class="paymentBadgeClass(p.status)">{{ p.status.charAt(0) + p.status.slice(1).toLowerCase() }}</span></td>
                  </tr>
                  <tr v-if="!loading && payments.length === 0"><td colspan="3" class="td-muted">No payments yet.</td></tr>
                </tbody>
              </table>
            </div>

            <!-- Maintenance queue -->
            <div class="panel">
              <div class="panel-hdr">
                <span class="panel-title">Maintenance queue</span>
                <button class="panel-link" @click="navigate('maintenance')">View all</button>
              </div>
              <div class="mq-list">
                <div v-if="loading" class="td-muted">Loading…</div>
                <div v-for="m in maintenance.slice(0, 4)" :key="m.id" class="mq-item">
                  <div class="mq-body">
                    <p class="mq-title">{{ m.title }}</p>
                    <p class="mq-sub">{{ m.tenant_id ? m.tenant_id.slice(0,6) : 'N/A' }} · {{ formatDate(m.created_at) }}</p>
                  </div>
                  <span class="badge" :class="maintenanceBadgeClass(m.status)">{{ m.status.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) }}</span>
                </div>
                <div v-if="!loading && maintenance.length === 0" class="td-muted">No maintenance requests.</div>
              </div>
            </div>

            <!-- Recent activity -->
            <div class="panel">
              <div class="panel-hdr">
                <span class="panel-title">Recent activity</span>
                <button class="panel-link" @click="navigate('messages')">View all</button>
              </div>
              <div class="activity-list">
                <div v-if="loading" class="td-muted">Loading…</div>
                <div v-for="n in notifications.slice(0, 5)" :key="n.id" class="activity-item">
                  <span class="activity-dot" :class="activityDotClass(n.notification_type)"></span>
                  <div class="activity-body">
                    <p class="activity-text">{{ n.title }} — {{ n.message }}</p>
                    <span class="activity-time">{{ timeAgo(n.created_at) }}</span>
                  </div>
                </div>
                <div v-if="!loading && notifications.length === 0" class="td-muted">No recent activity.</div>
              </div>
            </div>
          </div>

          <!-- Quick table: pending applications -->
          <div v-if="bookings.length > 0" class="panel mt16">
            <div class="panel-hdr">
              <span class="panel-title">Pending applications ({{ bookings.length }})</span>
              <button class="panel-link" @click="navigate('bookings')">View all</button>
            </div>
            <table class="ptable">
              <thead><tr><th>Name</th><th>Room</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="b in bookings.slice(0, 3)" :key="b.id">
                  <td>{{ b.full_name }}</td>
                  <td>{{ b.room_number ?? b.room_id.slice(0,8) }}</td>
                  <td>{{ formatDate(b.created_at) }}</td>
                  <td>
                    <button class="action-btn approve" @click="approveBooking(b.id)">Approve</button>
                    <button class="action-btn reject"  @click="rejectBooking(b.id)">Reject</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ TENANTS ════════════════════════ -->
        <div v-else-if="activeSection === 'tenants'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Tenants</h1>
              <p class="page-sub">{{ tenantStats?.active ?? 0 }} active · {{ tenantStats?.pending ?? 0 }} pending</p>
            </div>
          </div>
          <div class="panel">
            <div class="panel-hdr">
              <input v-model="tenantSearch" type="search" class="search-input" placeholder="Search by name, email, or phone…">
            </div>
            <table class="ptable full">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Room</th><th>Status</th><th>Balance</th><th>Since</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
                <tr v-for="t in filteredTenants" :key="t.id">
                  <td class="td-name">{{ t.full_name }}</td>
                  <td class="td-muted">{{ t.email }}</td>
                  <td>{{ t.phone }}</td>
                  <td>{{ t.room_id ? t.room_id.slice(0,8) : '—' }}</td>
                  <td><span class="badge" :class="t.status === 'ACTIVE' ? 'badge-paid' : t.status === 'PENDING' ? 'badge-pending' : 'badge-unpaid'">{{ t.status }}</span></td>
                  <td :class="t.outstanding_balance > 0 ? 'td-danger' : ''">{{ formatMoney(t.outstanding_balance) }}</td>
                  <td class="td-muted">{{ formatDate(t.created_at) }}</td>
                </tr>
                <tr v-if="!loading && filteredTenants.length === 0"><td colspan="7" class="td-muted">No tenants found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ ROOMS ════════════════════════ -->
        <div v-else-if="activeSection === 'rooms'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Rooms</h1>
              <p class="page-sub">{{ dashboard?.rooms?.total ?? 0 }} total · {{ dashboard?.rooms?.vacant ?? 0 }} vacant · {{ dashboard?.rooms?.occupied ?? 0 }} occupied</p>
            </div>
            <div class="hdr-actions">
              <button class="btn-primary" @click="openAddRoom">+ Add Room</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-hdr">
              <input v-model="roomSearch" type="search" class="search-input" placeholder="Search by room number or status…">
            </div>
            <table class="ptable full">
              <thead><tr><th>Room #</th><th>Status</th><th>Occupants</th><th>Monthly Rent</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-muted">Loading…</td></tr>
                <tr v-for="r in filteredRooms" :key="r.id">
                  <td class="td-name">{{ r.room_number }}</td>
                  <td><span class="badge" :class="r.status === 'VACANT' ? 'badge-paid' : r.status === 'OCCUPIED' ? 'badge-inprogress' : r.status === 'MAINTENANCE' ? 'badge-partial' : 'badge-pending'">{{ r.status }}</span></td>
                  <td>{{ r.current_occupants ?? 0 }} / {{ r.capacity ?? '—' }}</td>
                  <td>{{ formatMoney(r.monthly_rent) }}</td>
                  <td class="td-actions">
                    <button
                      v-if="r.status === 'MAINTENANCE'"
                      class="action-btn approve"
                      title="Mark room as Vacant (available)"
                      @click="setRoomVacant(r.id)"
                    >Set Vacant</button>
                    <button
                      v-if="r.status !== 'MAINTENANCE'"
                      class="action-btn outline"
                      title="Set room to Maintenance (deactivate)"
                      @click="setRoomMaintenance(r.id)"
                    >Set Maintenance</button>
                    <button
                      class="action-btn reject"
                      title="Permanently delete room (admin only)"
                      @click="removeRoom(r.id, r.room_number)"
                    >Remove</button>
                  </td>
                </tr>
                <tr v-if="!loading && filteredRooms.length === 0"><td colspan="5" class="td-muted">No rooms found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ LEASES ════════════════════════ -->
        <div v-else-if="activeSection === 'leases'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Leases</h1>
              <p class="page-sub">{{ dashboard?.leases?.active ?? 0 }} active · {{ dashboard?.leases?.expiring_soon ?? 0 }} expiring soon</p>
            </div>
          </div>
          <div class="panel">
            <table class="ptable full">
              <thead><tr><th>ID</th><th>Tenant</th><th>Room</th><th>Status</th><th>Start</th><th>End</th><th>Rent</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
                <tr v-for="l in leases" :key="l.id">
                  <td class="td-muted">{{ l.id.slice(0, 8) }}…</td>
                  <td>{{ l.tenant_id.slice(0, 8) }}</td>
                  <td>{{ l.room_id.slice(0, 8) }}</td>
                  <td><span class="badge" :class="l.status === 'ACTIVE' ? 'badge-paid' : l.status === 'PENDING' ? 'badge-pending' : 'badge-unpaid'">{{ l.status }}</span></td>
                  <td>{{ formatDate(l.start_date) }}</td>
                  <td>{{ formatDate(l.end_date) }}</td>
                  <td>{{ formatMoney(l.monthly_rent) }}</td>
                </tr>
                <tr v-if="!loading && leases.length === 0"><td colspan="7" class="td-muted">No leases found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ PAYMENTS ════════════════════════ -->
        <div v-else-if="activeSection === 'payments'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Payments</h1>
              <p class="page-sub">{{ paymentStats?.paid_count ?? 0 }} paid · {{ paymentStats?.unpaid_count ?? 0 }} unpaid · {{ paymentStats?.partial_count ?? 0 }} partial</p>
            </div>
          </div>
          <div class="stats-grid mini">
            <div class="mini-stat"><span>Total collected</span><strong>{{ formatMoney(paymentStats?.total_collected) }}</strong></div>
            <div class="mini-stat"><span>Outstanding</span><strong class="danger">{{ formatMoney(paymentStats?.total_outstanding) }}</strong></div>
            <div class="mini-stat"><span>Monthly revenue</span><strong>{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</strong></div>
            <div class="mini-stat"><span>Unpaid count</span><strong class="danger">{{ paymentStats?.unpaid_count ?? 0 }}</strong></div>
          </div>
          <div class="panel">
            <table class="ptable full">
              <thead><tr><th>Tenant</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="5" class="td-muted">Loading…</td></tr>
                <tr v-for="p in payments" :key="p.id">
                  <td>{{ p.tenant_id.slice(0, 8) }}</td>
                  <td class="td-amt">{{ formatMoney(p.amount) }}</td>
                  <td>{{ p.method }}</td>
                  <td><span class="badge" :class="paymentBadgeClass(p.status)">{{ p.status }}</span></td>
                  <td>{{ formatDate(p.payment_date) }}</td>
                </tr>
                <tr v-if="!loading && payments.length === 0"><td colspan="5" class="td-muted">No payments found.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ REPORTS ════════════════════════ -->
        <div v-else-if="activeSection === 'reports'">
          <div class="page-hdr">
            <div><h1 class="page-title">Reports</h1><p class="page-sub">Occupancy, revenue, and operational summary</p></div>
          </div>
          <div class="stats-grid mini">
            <div class="mini-stat"><span>Total tenants</span><strong>{{ tenantStats?.total ?? 0 }}</strong></div>
            <div class="mini-stat"><span>Active tenants</span><strong>{{ tenantStats?.active ?? 0 }}</strong></div>
            <div class="mini-stat"><span>Occupancy rate</span><strong>{{ Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) }}%</strong></div>
            <div class="mini-stat"><span>Active leases</span><strong>{{ dashboard?.leases?.active ?? 0 }}</strong></div>
            <div class="mini-stat"><span>Monthly revenue</span><strong>{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</strong></div>
            <div class="mini-stat"><span>Outstanding balance</span><strong class="danger">{{ formatMoney(paymentStats?.total_outstanding) }}</strong></div>
            <div class="mini-stat"><span>Maintenance open</span><strong>{{ (dashboard?.maintenance?.submitted ?? 0) + (dashboard?.maintenance?.in_progress ?? 0) }}</strong></div>
            <div class="mini-stat"><span>Pending applications</span><strong>{{ bookings.length }}</strong></div>
          </div>
        </div>

        <!-- ════════════════════════ MAINTENANCE ════════════════════ -->
        <div v-else-if="activeSection === 'maintenance'">
          <div class="page-hdr">
            <div>
              <h1 class="page-title">Maintenance</h1>
              <p class="page-sub">{{ dashboard?.maintenance?.submitted ?? 0 }} submitted · {{ dashboard?.maintenance?.in_progress ?? 0 }} in progress · {{ dashboard?.maintenance?.completed ?? 0 }} completed</p>
            </div>
          </div>
          <div class="panel">
            <table class="ptable full">
              <thead><tr><th>Title</th><th>Description</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="6" class="td-muted">Loading…</td></tr>
                <tr v-for="m in maintenance" :key="m.id">
                  <td class="td-name">{{ m.title }}</td>
                  <td class="td-muted">{{ m.description ? m.description.slice(0, 50) + (m.description.length > 50 ? '…' : '') : '—' }}</td>
                  <td><span class="badge" :class="m.priority === 'HIGH' || m.priority === 'URGENT' ? 'badge-unpaid' : m.priority === 'MEDIUM' ? 'badge-partial' : 'badge-assigned'">{{ m.priority }}</span></td>
                  <td><span class="badge" :class="maintenanceBadgeClass(m.status)">{{ m.status.replace('_', ' ') }}</span></td>
                  <td>{{ formatDate(m.created_at) }}</td>
                  <td>
                    <button v-if="m.status === 'SUBMITTED' || m.status === 'ASSIGNED'" class="action-btn approve" @click="updateMaintenanceStatus(m.id, 'start')">Start</button>
                    <button v-if="m.status === 'IN_PROGRESS'" class="action-btn approve" @click="updateMaintenanceStatus(m.id, 'complete')">Complete</button>
                    <button v-if="m.status === 'COMPLETED'" class="action-btn outline" @click="updateMaintenanceStatus(m.id, 'close')">Close</button>
                  </td>
                </tr>
                <tr v-if="!loading && maintenance.length === 0"><td colspan="6" class="td-muted">No maintenance requests.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ════════════════════════ MESSAGES ════════════════════════ -->
        <div v-else-if="activeSection === 'messages'">
          <div class="page-hdr">
            <div><h1 class="page-title">Messages</h1><p class="page-sub">Notifications and system activity</p></div>
          </div>
          <div class="panel">
            <div class="activity-list full">
              <div v-if="loading" class="td-muted">Loading…</div>
              <div v-for="n in notifications" :key="n.id" class="activity-item">
                <span class="activity-dot" :class="activityDotClass(n.notification_type)"></span>
                <div class="activity-body">
                  <p class="activity-text"><strong>{{ n.title }}</strong> — {{ n.message }}</p>
                  <span class="activity-time">{{ timeAgo(n.created_at) }} · {{ n.notification_type }}</span>
                </div>
              </div>
              <div v-if="!loading && notifications.length === 0" class="td-muted">No notifications.</div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════ BOOKINGS ════════════════════════ -->
        <div v-else-if="activeSection === 'bookings'">
          <div class="page-hdr">
            <div><h1 class="page-title">Applications</h1><p class="page-sub">{{ bookings.length }} pending tenant applications</p></div>
          </div>
          <div class="panel">
            <table class="ptable full">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Room</th><th>Move-in</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td colspan="7" class="td-muted">Loading…</td></tr>
                <tr v-for="b in bookings" :key="b.id">
                  <td class="td-name">{{ b.full_name }}</td>
                  <td class="td-muted">{{ b.email }}</td>
                  <td>{{ b.phone }}</td>
                  <td>{{ b.room_number ?? b.room_id.slice(0,8) }}</td>
                  <td>{{ formatDate(b.desired_move_in_date) }}</td>
                  <td>{{ formatDate(b.created_at) }}</td>
                  <td>
                    <button class="action-btn approve" @click="approveBooking(b.id)">Approve</button>
                    <button class="action-btn reject"  @click="rejectBooking(b.id)">Reject</button>
                  </td>
                </tr>
                <tr v-if="!loading && bookings.length === 0"><td colspan="7" class="td-muted">No pending applications.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>

    <!-- ════════════ ADD ROOM MODAL ════════════ -->
    <Transition name="modal-fade">
      <div v-if="showAddRoomModal" class="modal-overlay" @click.self="showAddRoomModal = false">
        <div class="modal-box" role="dialog" aria-modal="true" aria-label="Add Room">
          <div class="modal-hdr">
            <h2 class="modal-title">Add New Room</h2>
            <button class="modal-close" @click="showAddRoomModal = false">✕</button>
          </div>

          <div v-if="roomFormError" class="form-error">{{ roomFormError }}</div>

          <form class="modal-form" @submit.prevent="submitAddRoom">
            <div class="form-row">
              <div class="form-group">
                <label>Room Number <span class="req">*</span></label>
                <input v-model="roomForm.room_number" type="text" placeholder="e.g. 2A" class="form-input" required />
              </div>
              <div class="form-group">
                <label>Floor Level</label>
                <select v-model="roomForm.floor_level" class="form-input">
                  <option :value="undefined">— Select floor —</option>
                  <option v-for="f in floorLevels" :key="f" :value="f">{{ f.charAt(0) + f.slice(1).toLowerCase() }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Room Type</label>
                <select v-model="roomForm.room_type" class="form-input">
                  <option v-for="t in roomTypes" :key="t" :value="t">{{ t.charAt(0) + t.slice(1).toLowerCase() }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Max Occupants</label>
                <input v-model.number="roomForm.max_occupants" type="number" min="1" max="20" class="form-input" />
              </div>
            </div>

            <div class="form-group full">
              <label>Description</label>
              <textarea v-model="roomForm.description" class="form-textarea" rows="2" placeholder="Optional room description…"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Monthly Rate (₱) <span class="req">*</span></label>
                <input v-model.number="roomForm.monthly_rate" type="number" min="1" step="100" class="form-input" required />
              </div>
              <div class="form-group">
                <label>Deposit Multiplier</label>
                <input v-model.number="roomForm.deposit_multiplier" type="number" min="0" step="0.5" class="form-input" />
              </div>
              <div class="form-group">
                <label>Advance Multiplier</label>
                <input v-model.number="roomForm.advance_multiplier" type="number" min="0" step="0.5" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Length (sqm)</label>
                <input v-model.number="roomForm.dimension!.length_sqm" type="number" min="1" step="0.5" class="form-input" placeholder="Optional" />
              </div>
              <div class="form-group">
                <label>Width (sqm)</label>
                <input v-model.number="roomForm.dimension!.width_sqm" type="number" min="1" step="0.5" class="form-input" placeholder="Optional" />
              </div>
            </div>

            <div class="form-group full">
              <label>Amenities</label>
              <div class="amenity-input-row">
                <input v-model="amenityInput" type="text" class="form-input" placeholder="e.g. Air Conditioning" @keydown.enter.prevent="addAmenity" />
                <button type="button" class="btn-outline" @click="addAmenity">+ Add</button>
              </div>
              <div v-if="amenityList.length > 0" class="amenity-chips">
                <span v-for="(a, i) in amenityList" :key="i" class="amenity-chip">
                  {{ a.name }}
                  <button type="button" class="chip-remove" @click="removeAmenity(i)">×</button>
                </span>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" @click="showAddRoomModal = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="roomFormLoading">
                {{ roomFormLoading ? 'Creating…' : 'Create Room' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Shell ── */
.shell { display: flex; height: 100vh; width: 100%; background: #f3f0fb; overflow: hidden; }
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.content { flex: 1; overflow-y: auto; padding: 26px 28px; }

/* ── Error ── */
.error-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 10px 14px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 10px; font-size: 13px; }
.error-bar button { background: none; border: none; cursor: pointer; color: #991b1b; font-size: 15px; }

/* ── Page header ── */
.page-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.page-title { font-size: 24px; font-weight: 800; color: #160d27; margin: 0 0 4px; letter-spacing: -.03em; }
.page-sub { font-size: 13px; color: #9ca3af; margin: 0; }
.hdr-actions { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
.btn-outline { border: 1px solid #e0ddf7; background: #fff; color: #374151; border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: border-color .15s; }
.btn-outline:hover { border-color: #ae68fa; color: #ae68fa; }
.btn-primary { border: none; background: linear-gradient(135deg, #ae68fa, #f1966e); color: #fff; border-radius: 9px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-primary:hover { opacity: .9; }

/* ── Loading ── */
.loading-bar { text-align: center; color: #ae68fa; font-size: 13px; margin-bottom: 12px; }

/* ── Stat cards ── */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.stats-grid.mini { grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
.stat-card { border-radius: 16px; padding: 18px 20px 14px; position: relative; overflow: hidden; min-height: 110px; display: flex; flex-direction: column; justify-content: space-between; }
.sc-blue   { background: linear-gradient(135deg, #c7d9f8 0%, #a3bef5 60%, #89adf0 100%); }
.sc-teal   { background: linear-gradient(135deg, #a8eedf 0%, #72dcc6 60%, #58d0b8 100%); }
.sc-yellow { background: linear-gradient(135deg, #fdeaa5 0%, #fad760 60%, #f7c832 100%); }
.sc-red    { background: linear-gradient(135deg, #fbc4c4 0%, #f89898 60%, #f27878 100%); }
.sc-top { display: flex; align-items: center; justify-content: space-between; }
.sc-label { font-size: 12px; font-weight: 600; color: rgba(22,13,39,.65); }
.sc-icon { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,.45); display: flex; align-items: center; justify-content: center; color: rgba(22,13,39,.7); }
.sc-value { font-size: 30px; font-weight: 800; color: #160d27; letter-spacing: -.04em; margin: 4px 0 0; line-height: 1; }
.sc-denom { font-size: 16px; font-weight: 500; color: rgba(22,13,39,.55); }
.sc-trend { font-size: 12px; font-weight: 600; margin-top: 4px; }
.sc-trend.up { color: #166534; }
.sc-trend.down { color: #991b1b; }
.sc-trend.neutral { color: rgba(22,13,39,.6); }
.sc-sparkline { height: 28px; }

/* ── Mini stats ── */
.mini-stat { background: #fff; border: 1px solid #e0ddf7; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.mini-stat span { font-size: 12px; color: #9ca3af; }
.mini-stat strong { font-size: 20px; font-weight: 800; color: #160d27; }
.mini-stat strong.danger { color: #dc2626; }

/* ── Panels row ── */
.panels-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.panel { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 12px rgba(149,132,226,.06); }
.panel.mt16 { margin-top: 14px; }
.panel-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.panel-title { font-size: 13px; font-weight: 700; color: #160d27; }
.panel-link { background: none; border: none; font-size: 12px; font-weight: 600; color: #ae68fa; cursor: pointer; font-family: inherit; }
.panel-link:hover { color: #f1966e; }

/* ── Payment table ── */
.ptable { width: 100%; border-collapse: collapse; font-size: 13px; }
.ptable.full { font-size: 12.5px; }
.ptable th { text-align: left; padding: 7px 10px; color: #c4b8e8; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; border-bottom: 1px solid #f3f0fb; }
.ptable td { padding: 9px 10px; border-bottom: 1px solid #f9f7ff; vertical-align: middle; }
.ptable tr:last-child td { border-bottom: none; }
.ptable tr:hover td { background: #faf7ff; }
.td-name { font-weight: 600; color: #160d27; }
.td-amt  { font-weight: 700; color: #160d27; }
.td-muted { color: #9ca3af; font-size: 12px; text-align: center; padding: 14px; }
.td-danger { color: #dc2626; font-weight: 600; }

/* ── Badges ── */
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; }
.badge-paid      { background: #dcfce7; color: #166534; }
.badge-unpaid    { background: #fee2e2; color: #991b1b; }
.badge-partial   { background: #fef3c7; color: #92400e; }
.badge-inprogress{ background: #fef9c3; color: #854d0e; }
.badge-assigned  { background: #ccfbf1; color: #0f766e; }
.badge-pending   { background: #fee2e2; color: #991b1b; }
.badge-done      { background: #f0fdf4; color: #166534; }

/* ── Maintenance queue ── */
.mq-list { display: flex; flex-direction: column; gap: 10px; }
.mq-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mq-body { min-width: 0; flex: 1; }
.mq-title { margin: 0; font-size: 12.5px; font-weight: 600; color: #160d27; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mq-sub { margin: 2px 0 0; font-size: 11px; color: #9ca3af; }

/* ── Activity feed ── */
.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-list.full { gap: 14px; }
.activity-item { display: flex; align-items: flex-start; gap: 10px; }
.activity-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
.dot-green  { background: #22c55e; }
.dot-blue   { background: #3b82f6; }
.dot-orange { background: #f97316; }
.dot-red    { background: #ef4444; }
.activity-body { min-width: 0; }
.activity-text { margin: 0; font-size: 12px; color: #374151; line-height: 1.4; }
.activity-time { font-size: 11px; color: #c4b8e8; margin-top: 2px; display: block; }

/* ── Search input ── */
.search-input { flex: 1; min-width: 220px; padding: 8px 12px; border: 1px solid #e0ddf7; border-radius: 9px; font-size: 13px; font-family: inherit; background: #faf7ff; }
.search-input::placeholder { color: #c4b8e8; }

/* ── Action buttons ── */
.action-btn { padding: 4px 10px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; margin-right: 4px; font-family: inherit; }
.action-btn.approve { background: #dcfce7; color: #166534; }
.action-btn.reject  { background: #fee2e2; color: #991b1b; }
.action-btn.outline { background: #f3f0fb; color: #6b7280; border: 1px solid #e0ddf7; }

/* ── Table action cell ── */
.td-actions { white-space: nowrap; }

/* ── Responsive ── */
@media (max-width: 1200px) { .panels-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .stats-grid.mini { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px)  { .panels-row { grid-template-columns: 1fr; } .page-hdr { flex-direction: column; gap: 12px; } }
@media (max-width: 600px)  { .stats-grid { grid-template-columns: 1fr; } .content { padding: 16px; } }

/* ── Modal overlay ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(22, 13, 39, .55);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.modal-box {
  background: #fff; border-radius: 18px;
  width: 100%; max-width: 560px; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 24px 80px rgba(22,13,39,.28);
  display: flex; flex-direction: column;
}
.modal-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 24px 0; flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: 800; color: #160d27; margin: 0; }
.modal-close {
  background: none; border: none; font-size: 18px; cursor: pointer;
  color: #9ca3af; width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: #f3f0fb; color: #160d27; }

/* ── Form layout ── */
.modal-form { padding: 18px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row:has(.form-group:nth-child(3)) { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 11.5px; font-weight: 600; color: #6b7280; }
.form-input {
  padding: 8px 10px; border: 1.5px solid #e0ddf7; border-radius: 9px;
  font-size: 13px; font-family: inherit; background: #faf7ff; color: #160d27;
  transition: border-color .15s;
}
.form-input:focus { outline: none; border-color: #ae68fa; }
.form-textarea {
  padding: 8px 10px; border: 1.5px solid #e0ddf7; border-radius: 9px;
  font-size: 13px; font-family: inherit; background: #faf7ff; color: #160d27;
  resize: vertical;
}
.form-textarea:focus { outline: none; border-color: #ae68fa; }
.req { color: #ef4444; }
.form-error { margin: 0 24px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 9px; color: #991b1b; font-size: 12.5px; }

/* ── Amenity chips ── */
.amenity-input-row { display: flex; gap: 8px; align-items: center; }
.amenity-input-row .form-input { flex: 1; }
.amenity-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.amenity-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: #ede9fb; color: #5b2d9e; border-radius: 999px;
  padding: 3px 10px; font-size: 12px; font-weight: 600;
}
.chip-remove {
  background: none; border: none; cursor: pointer; color: #9ca3af;
  font-size: 14px; line-height: 1; padding: 0; display: flex; align-items: center;
}
.chip-remove:hover { color: #ef4444; }

/* ── Modal footer ── */
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; border-top: 1px solid #f3f0fb; margin-top: 4px; }

/* ── Modal transition ── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
