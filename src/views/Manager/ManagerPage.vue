<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import DashboardSidebar from '@/components/dashboard_layout/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard_layout/DashboardTopbar.vue'
import Manager_Tenants      from './Manager_Tenants.vue'
import Manager_Rooms         from './Manager_Rooms.vue'
import Manager_Leases        from './Manager_Leases.vue'
import Manager_Payments      from './Manager_Payments.vue'
import Manager_Reports       from './Manager_Reports.vue'
import Manager_Maintenance   from './Manager_Maintenance.vue'
import Manager_Messages      from './Manager_Messages.vue'
import Manager_Applications  from './Manager_Applications.vue'
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

type ExtendedManagerPayment = ManagerPayment & {
  type?: string
  receipt_number?: string
}

type ExtendedManagerRoom = ManagerRoom & {
  max_occupants?: number
}

type ExtendedTenantResponse = TenantResponse & {
  room_number?: string
  room_id?: string
}

const router   = useRouter()
const auth     = useAuthStore()

const sidebarOpen   = ref(true)
const activeSection = ref<Section>('dashboard')
const loading       = ref(false)
const error         = ref('')

const dashboard      = ref<ManagerDashboardPayload | null>(null)
const rooms          = ref<ExtendedManagerRoom[]>([])
const leases         = ref<ManagerLease[]>([])
const payments       = ref<ExtendedManagerPayment[]>([])
const maintenance    = ref<ManagerMaintenance[]>([])
const bookings           = ref<BookingItem[]>([])
const approvedBookings   = ref<BookingItem[]>([])
const viewingBooking     = ref<BookingItem | null>(null)
const confirmRejectId    = ref('')
const rejectReason       = ref('')
const bookingActionError = ref('')
const tenants        = ref<ExtendedTenantResponse[]>([])
const tenantStats    = ref<TenantStats | null>(null)
const paymentStats   = ref<PaymentStats | null>(null)
const notifications  = ref<NotificationItem[]>([])
const dashAnalytics  = ref<any>(null)

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
  property_name:       '',
  location:            '',
  address:             '',
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
    property_name:      '',
    location:           '',
    address:            '',
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
      room_number:   roomForm.value.room_number.trim(),
      description:   roomForm.value.description?.trim() || undefined,
      property_name: roomForm.value.property_name?.trim() || undefined,
      location:      roomForm.value.location?.trim() || undefined,
      address:       roomForm.value.address?.trim() || undefined,
      amenities:     amenityList.value.length > 0 ? [...amenityList.value] : undefined,
      dimension:     (roomForm.value.dimension?.length_sqm || roomForm.value.dimension?.width_sqm)
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

// ── Core unassign helper ───────────────────────────────────────────────────────
// Single source of truth for unassigning. Always calls DELETE /api/tenants/:id/unassign
// which does: free room → terminate lease → delete all bookings → delete tenant profile.
// The user account is preserved so they can book again.
async function doUnassign(tenantId: string, roomNumber: string): Promise<void> {
  if (!window.confirm(
    `Unassign tenant from room ${roomNumber}?\n\nThis will:\n• Set the room to Vacant\n• Terminate their lease\n• Delete their booking records\n• Remove their tenant profile\n\nThe user account is kept — they can book again.`
  )) return

  const res = await fetch(`/api/tenants/${tenantId}/unassign`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` },
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(extractFetchError(json, 'Failed to unassign tenant.'))
  }

  await loadManagerData()
}

// ── ROOMS: removeRoom ─────────────────────────────────────────────────────────
// For OCCUPIED/RESERVED rooms: find the linked tenant profile and call doUnassign.
// For VACANT/MAINTENANCE rooms: permanently delete (admin only).
async function removeRoom(id: string, roomNumber: string, roomStatus: string) {
  const isOccupied = roomStatus === 'OCCUPIED' || roomStatus === 'RESERVED'

  if (isOccupied) {
    // Find the linked tenant profile by room_id
    const linkedTenant = tenants.value.find(t => t.room_id === id)

    if (linkedTenant?.id) {
      // Happy path: tenant profile exists → full cleanup via /unassign
      try {
        await doUnassign(linkedTenant.id, roomNumber)
      } catch (e: any) {
        error.value = extractError(e, 'Failed to unassign tenant.')
      }
    } else {
      // No tenant profile yet (booking approved but profile not created) —
      // just delete the booking record and free the room directly.
      // Do NOT call bookingService.review() — that errors on already-reviewed bookings.
      const linkedBooking = approvedBookings.value.find(b => b.room_id === id)
      if (!window.confirm(
        `Unassign booking from room ${roomNumber}?\n\nThis will free the room and delete the booking record.`
      )) return

      try {
        if (linkedBooking?.id) {
          // Delete the booking record directly (manager delete endpoint)
          await fetch(`/api/bookings/manager/${linkedBooking.id}`, {
            method:  'DELETE',
            headers: { Authorization: `Bearer ${auth.token}` },
          })
        }
        // Always free the room
        await roomService.updateStatus(id, 'VACANT')
        await loadManagerData()
      } catch (e: any) {
        error.value = extractError(e, 'Failed to free room.')
      }
    }
    return
  }

  // Vacant or maintenance: permanent delete (admin only)
  if (!window.confirm(`Remove room ${roomNumber}? This cannot be undone.`)) return
  try {
    await roomService.deleteRoom(id)
    await loadManagerData()
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 403) {
      error.value = `Only admins can permanently delete rooms. Use "Set Maintenance" to deactivate room ${roomNumber}.`
    } else {
      error.value = extractError(e, 'Failed to remove room.')
    }
  }
}

async function setRoomMaintenance(id: string) {
  try {
    await roomService.updateStatus(id, 'MAINTENANCE')
    await loadManagerData()
  } catch (e: any) {
    error.value = extractError(e, 'Failed to update room status.')
  }
}

async function setRoomVacant(id: string) {
  const room = rooms.value.find(r => r.id === id)
  const occupants = room?.current_occupants ?? 0
  if (Number(occupants) > 0) {
    // Has occupants — must go through the full unassign flow
    await removeRoom(id, room?.room_number ?? id, 'OCCUPIED')
    return
  }
  try {
    await roomService.updateStatus(id, 'VACANT')
    await loadManagerData()
  } catch (e: any) {
    error.value = extractError(e, 'Failed to set room as vacant.')
  }
}

// ── TENANTS: unassign from Tenants table ─────────────────────────────────────
async function handleUnassignTenant(tenantId: string, fullName: string) {
  const tenant = tenants.value.find(x => x.id === tenantId)
  const roomNumber = tenant?.room_number
    ?? rooms.value.find(r => r.id === tenant?.room_id)?.room_number
    ?? 'their room'

  try {
    await doUnassign(tenantId, roomNumber)
  } catch (e: any) {
    error.value = extractError(e, `Failed to unassign ${fullName}.`)
  }
}

// ── TENANTS computed ──────────────────────────────────────────────────────────

const activeTenants = computed(() => tenants.value.filter(t => t.status === 'ACTIVE'))
const filteredTenants = computed(() =>
  tenantSearch.value
    ? activeTenants.value.filter(t =>
        t.full_name.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
        t.email.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
        t.phone.includes(tenantSearch.value))
    : activeTenants.value
)

interface ReservedTenant {
  id: string
  full_name: string
  email: string
  phone: string
  room_id?: string
  room_number?: string
  status: 'RESERVED'
  outstanding_balance: number
  created_at: string
  is_reserved: true
}

const reservedTenants = computed<ReservedTenant[]>(() => {
  const activeRoomIds = new Set(
    rooms.value
      .filter(r => r.status === 'RESERVED' || r.status === 'OCCUPIED')
      .map(r => r.id)
  )
  return approvedBookings.value
    .filter(b => activeRoomIds.has(b.room_id))
    .map(b => ({
      id: b.id,
      full_name: b.full_name,
      email: b.email,
      phone: b.phone,
      room_id: b.room_id,
      room_number: b.room_number,
      status: 'RESERVED' as const,
      outstanding_balance: 0,
      created_at: b.created_at,
      is_reserved: true as const,
    }))
})

const allTenantsDisplay = computed(() => {
  const regular = filteredTenants.value.map(t => ({ ...t, is_reserved: false as const }))
  const reserved = reservedTenants.value.filter(r =>
    !tenantSearch.value ||
    r.full_name.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
    r.email.toLowerCase().includes(tenantSearch.value.toLowerCase()) ||
    r.phone.includes(tenantSearch.value)
  )
  return [...regular, ...reserved]
})

const filteredRooms = computed(() =>
  roomSearch.value
    ? rooms.value.filter(r =>
        r.room_number.toLowerCase().includes(roomSearch.value.toLowerCase()) ||
        r.status.toLowerCase().includes(roomSearch.value.toLowerCase()))
    : rooms.value
)

const sidebarBadges = computed<Record<string, number>>(() => ({
  tenants:     (tenantStats.value?.total ?? 0) + reservedTenants.value.length,
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

function tenantNameById(id?: string): string {
  if (!id) return '—'
  const t = tenants.value.find(t => t.id === id)
  return t?.full_name ?? id.slice(0, 8)
}

function revBarHeight(val: number, data: { revenue: number; target: number }[]): number {
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue ?? 0, d.target ?? 0)), 1)
  return Math.max(4, Math.round((val / maxVal) * 120))
}

function activityDotClass(type: string) {
  if (type.includes('payment') || type.includes('PAYMENT')) return 'dot-blue'
  if (type.includes('maintenance') || type.includes('MAINTENANCE')) return 'dot-orange'
  if (type.includes('lease') || type.includes('LEASE')) return 'dot-red'
  return 'dot-green'
}

function extractError(e: any, fallback = 'An error occurred.'): string {
  const detail = e?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const loc = Array.isArray(d?.loc) ? d.loc.filter((l: any) => l !== 'body').join(' -> ') : ''
      const msg = d?.msg ?? JSON.stringify(d)
      return loc ? `"${loc}": ${msg}` : msg
    }).join('; ')
  }
  if (typeof detail === 'string' && detail) return detail
  return e?.message ?? fallback
}

function extractFetchError(json: any, fallback = 'An error occurred.'): string {
  const detail = json?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const loc = Array.isArray(d?.loc) ? d.loc.filter((l: any) => l !== 'body').join(' -> ') : ''
      const msg = d?.msg ?? JSON.stringify(d)
      return loc ? `"${loc}": ${msg}` : msg
    }).join('; ')
  }
  if (typeof detail === 'string' && detail) return detail
  return json?.message ?? fallback
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
    if (roomsRes.status === 'fulfilled')    rooms.value         = (roomsRes.value ?? []).map((r: any) => ({
      ...r,
      monthly_rent: r.monthly_rent ?? r.monthly_rate,
    }))
    if (leasesRes.status === 'fulfilled')   leases.value        = (leasesRes.value ?? []).map((l: any) => ({
      ...l,
      monthly_rent: l.monthly_rent ?? l.monthly_rate,
    }))
    if (paymentsRes.status === 'fulfilled') payments.value      = paymentsRes.value
    if (maintRes.status === 'fulfilled')    maintenance.value   = maintRes.value
    if (bookingsRes.status === 'fulfilled') bookings.value      = bookingsRes.value.bookings ?? []
    if (statsRes.status === 'fulfilled')    paymentStats.value  = statsRes.value
    if (notifRes.status === 'fulfilled')    notifications.value = notifRes.value

    const approvedRes = await bookingService.listAll({ status: 'APPROVED', limit: 50 })
    approvedBookings.value = approvedRes.bookings ?? []

    const [tListRes, tStatsRes] = await Promise.allSettled([
      tenantService.getAll({ limit: 100 }),
      tenantService.getStats(),
    ])
    if (tListRes.status === 'fulfilled')   tenants.value      = tListRes.value.data ?? []
    if (tStatsRes.status === 'fulfilled')  tenantStats.value  = tStatsRes.value.data ?? null

    // Load analytics for dashboard charts (non-blocking)
    managerService.getAnalytics()
      .then(data => { dashAnalytics.value = data })
      .catch(() => {})

  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load manager dashboard.'
  } finally {
    loading.value = false
  }
}

function viewBooking(b: BookingItem) { viewingBooking.value = b }
function closeBookingModal() {
  viewingBooking.value   = null
  confirmRejectId.value  = ''
  rejectReason.value     = ''
  bookingActionError.value = ''
}

// ── APPROVE booking ───────────────────────────────────────────────────────────
async function approveBooking(id: string) {
  try {
    await bookingService.review(id, { status: 'APPROVED', review_notes: 'Approved by manager' })
    closeBookingModal()
    await loadManagerData()
  } catch (e: any) {
    bookingActionError.value = extractError(e, 'Failed to approve booking.')
  }
}

// ── REJECT booking ────────────────────────────────────────────────────────────
// Calls bookingService.review(REJECTED) which on the backend:
//  1. Marks booking REJECTED
//  2. Frees the room
//  3. Terminates lease (if any)
//  4. Deletes tenant profile
//  5. Deletes all booking records for that user
// So the frontend just needs to call reject — no extra cleanup needed here.
async function rejectBooking(id: string) {
  if (!confirmRejectId.value) {
    confirmRejectId.value = id
    return
  }

  if (!rejectReason.value.trim()) {
    bookingActionError.value = 'A rejection reason is required before rejecting.'
    return
  }

  try {
    await bookingService.review(id, {
      status: 'REJECTED',
      review_notes: rejectReason.value.trim()
    })

    // Remove from local state immediately for snappy UI
    const rejected = [...bookings.value, ...approvedBookings.value].find(b => b.id === id)
    bookings.value         = bookings.value.filter(b => b.id !== id)
    approvedBookings.value = approvedBookings.value.filter(b => b.id !== id)
    if (rejected) {
      tenants.value = tenants.value.filter(t => t.user_id !== rejected.user_id)
    }

    closeBookingModal()
    await loadManagerData()
  } catch (e: any) {
    bookingActionError.value = extractError(e, 'Failed to reject booking.')
  }
}

// ── CONFIRM reserved tenant → create a lease ──────────────────────────────────
async function confirmTenant(bookingId: string, fullName: string) {
  if (!window.confirm(`Confirm ${fullName} as an active occupant? This will create an active lease for them.`)) return
  try {
    const booking = approvedBookings.value.find(b => b.id === bookingId)
    if (!booking?.room_id) throw new Error('Booking has no linked room — reload and try again.')

    const tenant = tenants.value.find(t => t.user_id === booking.user_id)
    if (!tenant?.id) throw new Error(
      `No tenant profile found for ${fullName}. They may need to complete account setup first.`
    )

    const room  = rooms.value.find(r => r.id === booking.room_id)
    const today = new Date().toISOString().split('T')[0]
    const oneYearLater = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString().split('T')[0]

    let monthlyRate = room?.monthly_rent ?? 0
    if (monthlyRate <= 0) {
      const input = window.prompt(
        `Room ${room?.room_number ?? booking.room_id} has no monthly rate set.\nEnter the monthly rate (₱):`,
        ''
      )
      if (input === null) return
      monthlyRate = parseFloat(input)
      if (isNaN(monthlyRate) || monthlyRate <= 0) {
        error.value = 'A valid monthly rate greater than ₱0 is required to create a lease.'
        return
      }
    }

    const res = await fetch('/api/leases/', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        tenant_id:    tenant.id,
        room_id:      booking.room_id,
        start_date:   today,
        end_date:     oneYearLater,
        monthly_rate: monthlyRate,
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(extractFetchError(json, 'Failed to create lease.'))
    }

    if (room) room.status = 'OCCUPIED'
    approvedBookings.value = approvedBookings.value.filter(b => b.id !== bookingId)

    await loadManagerData()
  } catch (e: any) {
    error.value = extractError(e, 'Failed to confirm tenant.')
  }
}

async function updateMaintenanceStatus(
  id: string,
  action: 'accept' | 'start' | 'complete' | 'reject' | 'close',
  payload?: { resolution?: string; rejection_reason?: string },
) {
  const statusMap: Record<string, string> = {
    accept:   'ASSIGNED',
    start:    'IN_PROGRESS',
    complete: 'COMPLETED',
    reject:   'REJECTED',
    close:    'CLOSED',
  }

  try {
    const body: Record<string, string | undefined> = {
      status: statusMap[action],
    }
    // COMPLETED → resolution note; REJECTED → rejection_reason (sent as resolution field)
    if (payload?.resolution)       body.resolution = payload.resolution
    if (payload?.rejection_reason) body.resolution = payload.rejection_reason

    const res = await fetch(`/api/maintenance/manager/${id}/status`, {
      method:  'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${auth.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(extractFetchError(json, 'Failed to update maintenance.'))
    }

    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to update maintenance.'
  }
}

onMounted(() => { void loadManagerData() })

// ── Record Payment Modal ──────────────────────────────────────────────────────
const showPaymentModal = ref(false)
const paymentLoading   = ref(false)
const paymentError     = ref('')
const paymentSuccess   = ref('')
const paymentForm = ref({
  tenant_id:    '',
  lease_id:     '',
  room_id:      '',
  amount:       0,
  type:         'RENT',
  method:       'CASH',
  reference_no: '',
  notes:        '',
  period_start: '',
  period_end:   '',
})

function openPaymentModal() {
  paymentError.value   = ''
  paymentSuccess.value = ''
  const first = tenants.value[0]
  const firstLease = leases.value[0]
  paymentForm.value = {
    tenant_id:    first?.id ?? '',
    lease_id:     firstLease?.id ?? '',
    room_id:      firstLease?.room_id ?? first?.room_id ?? '',
    amount:       0,
    type:         'RENT',
    method:       'CASH',
    reference_no: '',
    notes:        '',
    period_start: '',
    period_end:   '',
  }
  showPaymentModal.value = true
}

function assignPaymentFromLease(lease: ManagerLease) {
  paymentError.value   = ''
  paymentSuccess.value = ''
  paymentForm.value = {
    tenant_id:    lease.tenant_id,
    lease_id:     lease.id,
    room_id:      lease.room_id,
    amount:       lease.monthly_rent ?? 0,
    type:         'RENT',
    method:       'CASH',
    reference_no: '',
    notes:        `Rent for lease ${lease.id.slice(0, 8)}`,
    period_start: '',
    period_end:   '',
  }
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  paymentError.value     = ''
  paymentSuccess.value   = ''
}

function onPaymentTenantChange() {
  const tid   = paymentForm.value.tenant_id
  const lease = leases.value.find(l => l.tenant_id === tid)
  if (lease) {
    paymentForm.value.lease_id = lease.id
    paymentForm.value.room_id  = lease.room_id
  }
}

async function submitPayment() {
  paymentError.value   = ''
  paymentSuccess.value = ''
  if (!paymentForm.value.tenant_id) { paymentError.value = 'Please select a tenant.'; return }
  if (!paymentForm.value.lease_id)  { paymentError.value = 'Lease ID is required.'; return }
  if (!paymentForm.value.room_id)   { paymentError.value = 'Room ID is required.'; return }
  if (!paymentForm.value.amount || paymentForm.value.amount <= 0) { paymentError.value = 'Amount must be greater than 0.'; return }

  paymentLoading.value = true
  try {
    const payload: any = {
      tenant_id: paymentForm.value.tenant_id,
      lease_id:  paymentForm.value.lease_id,
      room_id:   paymentForm.value.room_id,
      amount:    Number(paymentForm.value.amount),
      type:      paymentForm.value.type,
      method:    paymentForm.value.method,
    }
    if (paymentForm.value.reference_no) payload.reference_no = paymentForm.value.reference_no
    if (paymentForm.value.notes)        payload.notes        = paymentForm.value.notes
    if (paymentForm.value.period_start) payload.period_start = new Date(paymentForm.value.period_start).toISOString()
    if (paymentForm.value.period_end)   payload.period_end   = new Date(paymentForm.value.period_end).toISOString()

    const res = await fetch('/api/manager/payments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body:    JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.detail ?? json?.message ?? 'Failed to record payment.')
    paymentSuccess.value = `Payment recorded! Receipt: ${json.receipt_number ?? '—'}`
    await loadManagerData()
  } catch (e: any) {
    paymentError.value = e?.message ?? 'Failed to record payment.'
  } finally {
    paymentLoading.value = false
  }
}

async function confirmPayment(paymentId: string) {
  try {
    const res = await fetch(`/api/manager/payments/${paymentId}/confirm`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json?.detail ?? 'Failed to confirm payment.')
    }
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to confirm payment.'
  }
}

async function deleteLease(leaseId: string) {
  if (!window.confirm('Delete this terminated lease? This cannot be undone.')) return
  try {
    const res = await fetch(`/api/manager/leases/${leaseId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json?.detail ?? 'Failed to delete lease.')
    }
    await loadManagerData()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to delete lease.'
  }
}
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
              <div class="sc-top"><span class="sc-label">Total tenants</span><div class="sc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div></div>
              <div class="sc-value">{{ tenantStats?.total ?? 0 }}</div>
              <div class="sc-trend up">▲ {{ tenantStats?.active ?? 0 }} active</div>
              <div class="sc-sparkline"></div>
            </div>
            <div class="stat-card sc-teal">
              <div class="sc-top"><span class="sc-label">Occupied rooms</span><div class="sc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/></svg></div></div>
              <div class="sc-value">{{ dashboard?.rooms?.occupied ?? 0 }} <span class="sc-denom">/ {{ dashboard?.rooms?.total ?? 0 }}</span></div>
              <div class="sc-trend neutral">{{ Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) }}% occupancy</div>
              <div class="sc-sparkline"></div>
            </div>
            <div class="stat-card sc-yellow">
              <div class="sc-top"><span class="sc-label">Monthly revenue</span><div class="sc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div></div>
              <div class="sc-value">{{ formatMoneyShort(paymentStats?.monthly_revenue ?? paymentStats?.monthly_collected) }}</div>
              <div class="sc-trend up">▲ total collected</div>
              <div class="sc-sparkline"></div>
            </div>
            <div class="stat-card sc-red">
              <div class="sc-top"><span class="sc-label">Unpaid rent</span><div class="sc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div></div>
              <div class="sc-value">{{ paymentStats?.unpaid_count ?? 0 }}</div>
              <div class="sc-trend down">▼ overdue tenants</div>
              <div class="sc-sparkline"></div>
            </div>
          </div>

          <!-- ── Revenue + Occupancy Breakdown Row ─────────────── -->
          <div class="charts-row" style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-bottom:20px;">
            <!-- Revenue Chart -->
            <div class="panel">
              <div class="panel-hdr">
                <span class="panel-title">Revenue — last 6 months</span>
                <button class="panel-link" @click="navigate('reports')">Full report</button>
              </div>
              <div v-if="dashAnalytics?.monthly_revenue?.length" class="rev-chart">
                <div class="rev-bars">
                  <div v-for="(m, i) in dashAnalytics.monthly_revenue" :key="i" class="rev-col">
                    <div class="rev-bar-pair">
                      <div class="rev-bar rev-target" :style="{ height: revBarHeight(m.target, dashAnalytics.monthly_revenue) + 'px' }" :title="'Target: ' + formatMoney(m.target)"></div>
                      <div class="rev-bar rev-actual" :style="{ height: revBarHeight(m.revenue, dashAnalytics.monthly_revenue) + 'px' }" :title="'Actual: ' + formatMoney(m.revenue)"></div>
                    </div>
                    <span class="rev-label">{{ m.month.split(' ')[0] }}</span>
                  </div>
                </div>
                <div class="rev-legend">
                  <span class="rev-leg-item"><span class="rev-dot" style="background:#d1d5db"></span> Target</span>
                  <span class="rev-leg-item"><span class="rev-dot" style="background:#6366f1"></span> Actual</span>
                </div>
              </div>
              <div v-else class="td-muted" style="padding:32px 0">No revenue data yet.</div>
            </div>

            <!-- Occupancy Breakdown -->
            <div class="panel">
              <div class="panel-hdr">
                <span class="panel-title">Occupancy breakdown</span>
                <button class="panel-link" @click="navigate('rooms')">View rooms</button>
              </div>
              <div class="occ-wrap">
                <div class="occ-donut-box">
                  <svg viewBox="0 0 120 120" class="occ-donut">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" stroke-width="14"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" stroke-width="14"
                      :stroke-dasharray="(Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) / 100 * 314) + ' 314'"
                      stroke-linecap="round" transform="rotate(-90 60 60)" />
                  </svg>
                  <div class="occ-center-label">
                    <span class="occ-pct">{{ Math.round(dashboard?.rooms?.occupancy_rate_pct ?? 0) }}%</span>
                    <span class="occ-sub">Occupied</span>
                  </div>
                </div>
                <div v-if="dashAnalytics?.occupancy_by_type?.length" class="occ-types">
                  <div v-for="t in dashAnalytics.occupancy_by_type" :key="t.type" class="occ-type-row">
                    <span class="occ-type-name">{{ t.type }}</span>
                    <div class="occ-type-bar-wrap">
                      <div class="occ-type-bar" :style="{ width: t.pct + '%' }"></div>
                    </div>
                    <span class="occ-type-pct">{{ t.pct }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Bottom 3 panels ─────────────────────────────────── -->
          <div class="panels-row">
            <div class="panel">
              <div class="panel-hdr"><span class="panel-title">Recent payments</span><button class="panel-link" @click="navigate('payments')">View all</button></div>
              <table class="ptable">
                <thead><tr><th>Tenant</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  <tr v-if="loading"><td colspan="3" class="td-muted">Loading…</td></tr>
                  <tr v-for="p in payments.slice(0, 4)" :key="p.id">
                    <td class="td-name">{{ tenantNameById(p.tenant_id) }}</td>
                    <td class="td-amt">{{ formatMoney(p.amount) }}</td>
                    <td><span class="badge" :class="paymentBadgeClass(p.status)">{{ p.status.charAt(0) + p.status.slice(1).toLowerCase() }}</span></td>
                  </tr>
                  <tr v-if="!loading && payments.length === 0"><td colspan="3" class="td-muted">No payments yet.</td></tr>
                </tbody>
              </table>
            </div>
            <div class="panel">
              <div class="panel-hdr"><span class="panel-title">Maintenance queue</span><button class="panel-link" @click="navigate('maintenance')">View all</button></div>
              <div class="mq-list">
                <div v-if="loading" class="td-muted">Loading…</div>
                <div v-for="m in maintenance.slice(0, 4)" :key="m.id" class="mq-item">
                  <div class="mq-body"><p class="mq-title">{{ m.title }}</p><p class="mq-sub">{{ tenantNameById(m.tenant_id) }} · {{ formatDate(m.created_at) }}</p></div>
                  <span class="badge" :class="maintenanceBadgeClass(m.status)">{{ m.status.replace('_', ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) }}</span>
                </div>
                <div v-if="!loading && maintenance.length === 0" class="td-muted">No maintenance requests.</div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-hdr"><span class="panel-title">Recent activity</span><button class="panel-link" @click="navigate('messages')">View all</button></div>
              <div class="activity-list">
                <div v-if="loading" class="td-muted">Loading…</div>
                <div v-for="n in notifications.slice(0, 5)" :key="n.id" class="activity-item">
                  <span class="activity-dot" :class="activityDotClass(n.notification_type)"></span>
                  <div class="activity-body"><p class="activity-text">{{ n.title }} — {{ n.message }}</p><span class="activity-time">{{ timeAgo(n.created_at) }}</span></div>
                </div>
                <div v-if="!loading && notifications.length === 0" class="td-muted">No recent activity.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════ TENANTS ════════════════════════ -->
        <Manager_Tenants
          v-else-if="activeSection === 'tenants'"
          :loading="loading"
          :tenant-stats="tenantStats"
          :reserved-count="reservedTenants.length"
          :all-tenants-display="allTenantsDisplay"
          :tenant-search="tenantSearch"
          :format-money="formatMoney"
          :format-date="formatDate"
          @update:tenant-search="tenantSearch = $event"
          @unassign-tenant="handleUnassignTenant"
        />

        <!-- ════════════════════════ ROOMS ════════════════════════ -->
        <Manager_Rooms
          v-else-if="activeSection === 'rooms'"
          :loading="loading"
          :dashboard="dashboard"
          :filtered-rooms="filteredRooms"
          :tenants="tenants"
          :approved-bookings="approvedBookings"
          :room-search="roomSearch"
          :format-money="formatMoney"
          @update:room-search="roomSearch = $event"
          @open-add-room="openAddRoom"
          @set-vacant="setRoomVacant"
          @set-maintenance="setRoomMaintenance"
          @remove-room="removeRoom"
        />

        <!-- ════════════════════════ LEASES ════════════════════════ -->
        <Manager_Leases
          v-else-if="activeSection === 'leases'"
          :loading="loading"
          :dashboard="dashboard"
          :leases="leases"
          :tenants="tenants"
          :format-date="formatDate"
          :format-money="formatMoney"
          @assign-payment="assignPaymentFromLease"
          @delete-lease="deleteLease"
        />

        <!-- ════════════════════════ PAYMENTS ════════════════════════ -->
        <Manager_Payments
          v-else-if="activeSection === 'payments'"
          :loading="loading"
          :payments="payments"
          :payment-stats="paymentStats"
          :tenants="tenants"
          :format-money="formatMoney"
          :format-money-short="formatMoneyShort"
          :format-date="formatDate"
          :payment-badge-class="paymentBadgeClass"
          @open-payment-modal="openPaymentModal"
          @confirm-payment="confirmPayment"
        />

        <!-- ════════════════════════ REPORTS ════════════════════════ -->
        <Manager_Reports
          v-else-if="activeSection === 'reports'"
          :tenant-stats="tenantStats"
          :dashboard="dashboard"
          :payment-stats="paymentStats"
          :bookings-count="bookings.length"
          :format-money="formatMoney"
          :format-money-short="formatMoneyShort"
        />

        <!-- ════════════════════════ MAINTENANCE ════════════════════ -->
        <Manager_Maintenance
          v-else-if="activeSection === 'maintenance'"
          :loading="loading"
          :dashboard="dashboard"
          :maintenance="maintenance"
          :format-date="formatDate"
          :maintenance-badge-class="maintenanceBadgeClass"
          @update-status="updateMaintenanceStatus"
        />

        <!-- ════════════════════════ MESSAGES ════════════════════════ -->
        <Manager_Messages
          v-else-if="activeSection === 'messages'"
          :loading="loading"
          :notifications="notifications"
          :activity-dot-class="activityDotClass"
          :time-ago="timeAgo"
        />

        <!-- ════════════════════════ BOOKINGS ════════════════════════ -->
        <Manager_Applications
          v-else-if="activeSection === 'bookings'"
          :loading="loading"
          :bookings="bookings"
          :format-date="formatDate"
          @view-booking="viewBooking"
        />

      </main>
    </div>

    <!-- ════════════ BOOKING VIEW MODAL ════════════ -->
    <Teleport to="body">
      <div v-if="viewingBooking" class="view-modal-overlay" @click.self="closeBookingModal">
        <div class="view-modal-card">
          <button class="view-modal-close" @click="closeBookingModal">✕</button>
          <div class="view-modal-hdr">
            <div style="font-size:36px;margin-bottom:6px">&#128203;</div>
            <h2>Booking Application</h2>
            <p>Room {{ viewingBooking.room_number ?? viewingBooking.room_id.slice(0,8) }} &mdash; &#8369;{{ viewingBooking.monthly_rent?.toLocaleString() ?? '—' }}/mo</p>
            <span class="vbadge" :class="viewingBooking.status === 'APPROVED' ? 'vbadge-approved' : viewingBooking.status === 'REJECTED' ? 'vbadge-rejected' : viewingBooking.status === 'CANCELLED' ? 'vbadge-cancelled' : 'vbadge-pending'">
              {{ viewingBooking.status }}
            </span>
          </div>

          <p class="vsec-label">Applicant Information</p>
          <div class="vg">
            <div class="vrow">
              <div class="vf"><span class="vfl">Full Name</span><span class="vfv">{{ viewingBooking.full_name }}{{ viewingBooking.last_name ? ' ' + viewingBooking.last_name : '' }}</span></div>
              <div class="vf"><span class="vfl">Email</span><span class="vfv">{{ viewingBooking.email }}</span></div>
            </div>
            <div class="vrow">
              <div class="vf"><span class="vfl">Phone</span><span class="vfv">{{ viewingBooking.phone }}</span></div>
              <div class="vf" v-if="viewingBooking.date_of_birth"><span class="vfl">Date of Birth</span><span class="vfv">{{ viewingBooking.date_of_birth }}</span></div>
            </div>
            <div class="vrow">
              <div class="vf" v-if="viewingBooking.gender"><span class="vfl">Gender</span><span class="vfv">{{ viewingBooking.gender }}</span></div>
              <div class="vf" v-if="viewingBooking.civil_status"><span class="vfl">Civil Status</span><span class="vfv">{{ viewingBooking.civil_status }}</span></div>
            </div>
            <div class="vrow">
              <div class="vf" v-if="viewingBooking.nationality"><span class="vfl">Nationality</span><span class="vfv">{{ viewingBooking.nationality }}</span></div>
              <div class="vf" v-if="viewingBooking.occupation"><span class="vfl">Occupation</span><span class="vfv">{{ viewingBooking.occupation }}</span></div>
            </div>
            <div class="vrow" v-if="viewingBooking.employer || viewingBooking.monthly_income">
              <div class="vf" v-if="viewingBooking.employer"><span class="vfl">Employer</span><span class="vfv">{{ viewingBooking.employer }}</span></div>
              <div class="vf" v-if="viewingBooking.monthly_income"><span class="vfl">Monthly Income</span><span class="vfv">{{ formatMoney(viewingBooking.monthly_income) }}</span></div>
            </div>
          </div>

          <p class="vsec-label">Address</p>
          <div class="vg">
            <div class="vf"><span class="vfl">Address</span><span class="vfv">{{ viewingBooking.address }}{{ viewingBooking.city ? ', ' + viewingBooking.city : '' }}{{ viewingBooking.province ? ', ' + viewingBooking.province : '' }}</span></div>
          </div>

          <p class="vsec-label">Booking Details</p>
          <div class="vg">
            <div class="vrow">
              <div class="vf" v-if="viewingBooking.desired_move_in_date"><span class="vfl">Move-in Date</span><span class="vfv">{{ viewingBooking.desired_move_in_date }}</span></div>
              <div class="vf"><span class="vfl">Submitted</span><span class="vfv">{{ formatDate(viewingBooking.created_at) }}</span></div>
            </div>
            <div class="vf" v-if="viewingBooking.message"><span class="vfl">Message</span><span class="vfv">{{ viewingBooking.message }}</span></div>
            <div class="vf" v-if="viewingBooking.id_document"><span class="vfl">ID Document</span><span class="vfv"><a :href="viewingBooking.id_document" target="_blank" style="color:#2563eb;text-decoration:underline">View Document</a></span></div>
          </div>

          <template v-if="viewingBooking.emergency_contact_name || viewingBooking.emergency_contact_phone">
            <p class="vsec-label">Emergency Contact</p>
            <div class="vg">
              <div class="vrow">
                <div class="vf" v-if="viewingBooking.emergency_contact_name"><span class="vfl">Name</span><span class="vfv">{{ viewingBooking.emergency_contact_name }}</span></div>
                <div class="vf" v-if="viewingBooking.emergency_contact_phone"><span class="vfl">Phone</span><span class="vfv">{{ viewingBooking.emergency_contact_phone }}</span></div>
              </div>
              <div class="vf" v-if="viewingBooking.emergency_contact_relationship"><span class="vfl">Relationship</span><span class="vfv">{{ viewingBooking.emergency_contact_relationship }}</span></div>
            </div>
          </template>

          <template v-if="viewingBooking.review_notes">
            <p class="vsec-label">Review Notes</p>
            <div class="vg"><div class="vf"><span class="vfl">Notes</span><span class="vfv">{{ viewingBooking.review_notes }}</span></div></div>
          </template>

          <!-- Approve / Reject — only for PENDING bookings -->
          <template v-if="viewingBooking.status === 'PENDING'">
            <div v-if="bookingActionError" style="margin-top:10px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;color:#991b1b;font-size:12.5px;display:flex;justify-content:space-between;align-items:center">
              {{ bookingActionError }}
              <button @click="bookingActionError = ''" style="background:none;border:none;cursor:pointer;color:#991b1b;font-size:14px;line-height:1">✕</button>
            </div>
            <div v-if="confirmRejectId === viewingBooking.id" style="margin-top:8px">
              <label style="font-size:12px;font-weight:600;color:#991b1b">Rejection reason <span style="color:#ef4444">*</span> <span style="font-weight:400;color:#6b7280">(required)</span></label>
              <input v-model="rejectReason" type="text" placeholder="Enter a reason for rejection…" style="margin-top:4px;width:100%;padding:8px 14px;border-radius:12px;border:1.5px solid #fca5a5;font-size:13px;box-sizing:border-box;outline:none;background:#fff" />
            </div>
            <div style="display:flex;gap:10px;margin-top:12px">
              <button class="vbtn-approve" @click="bookingActionError = ''; approveBooking(viewingBooking.id)">&#10003; Approve</button>
              <button class="vbtn-reject" @click="rejectBooking(viewingBooking.id)">{{ confirmRejectId === viewingBooking.id ? 'Confirm Reject' : '&#10007; Reject' }}</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ════════════ ADD ROOM MODAL ════════════ -->
    <Transition name="modal-fade">
      <div v-if="showAddRoomModal" class="modal-overlay" @click.self="showAddRoomModal = false">
        <div class="modal-box" role="dialog" aria-modal="true" aria-label="Add Room">
          <div class="modal-hdr"><h2 class="modal-title">Add New Room</h2><button class="modal-close" @click="showAddRoomModal = false">✕</button></div>
          <div v-if="roomFormError" class="form-error">{{ roomFormError }}</div>
          <form class="modal-form" @submit.prevent="submitAddRoom">
            <div class="form-row">
              <div class="form-group"><label>Room Number <span class="req">*</span></label><input v-model="roomForm.room_number" type="text" placeholder="e.g. 2A" class="form-input" required /></div>
              <div class="form-group"><label>Floor Level</label><select v-model="roomForm.floor_level" class="form-input"><option :value="undefined">— Select floor —</option><option v-for="f in floorLevels" :key="f" :value="f">{{ f.charAt(0) + f.slice(1).toLowerCase() }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Room Type</label><select v-model="roomForm.room_type" class="form-input"><option v-for="t in roomTypes" :key="t" :value="t">{{ t.charAt(0) + t.slice(1).toLowerCase() }}</option></select></div>
              <div class="form-group"><label>Max Occupants</label><input v-model.number="roomForm.max_occupants" type="number" min="1" max="20" class="form-input" /></div>
            </div>
            <div class="form-group full"><label>Description</label><textarea v-model="roomForm.description" class="form-textarea" rows="2" placeholder="Optional room description…"></textarea></div>
            <div class="form-group full"><label>Property Name</label><input v-model="roomForm.property_name" type="text" placeholder="e.g. Sun Residences" class="form-input" /></div>
            <div class="form-row">
              <div class="form-group"><label>Location / City</label><input v-model="roomForm.location" type="text" placeholder="e.g. Quezon City" class="form-input" /></div>
              <div class="form-group"><label>Full Address</label><input v-model="roomForm.address" type="text" placeholder="Street, Barangay" class="form-input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Monthly Rate (₱) <span class="req">*</span></label><input v-model.number="roomForm.monthly_rate" type="number" min="1" step="100" class="form-input" required /></div>
              <div class="form-group"><label>Deposit Multiplier</label><input v-model.number="roomForm.deposit_multiplier" type="number" min="0" step="0.5" class="form-input" /></div>
              <div class="form-group"><label>Advance Multiplier</label><input v-model.number="roomForm.advance_multiplier" type="number" min="0" step="0.5" class="form-input" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Length (sqm)</label><input v-model.number="roomForm.dimension!.length_sqm" type="number" min="1" step="0.5" class="form-input" placeholder="Optional" /></div>
              <div class="form-group"><label>Width (sqm)</label><input v-model.number="roomForm.dimension!.width_sqm" type="number" min="1" step="0.5" class="form-input" placeholder="Optional" /></div>
            </div>
            <div class="form-group full">
              <label>Amenities</label>
              <div class="amenity-input-row"><input v-model="amenityInput" type="text" class="form-input" placeholder="e.g. Air Conditioning" @keydown.enter.prevent="addAmenity" /><button type="button" class="btn-outline" @click="addAmenity">+ Add</button></div>
              <div v-if="amenityList.length > 0" class="amenity-chips"><span v-for="(a, i) in amenityList" :key="i" class="amenity-chip">{{ a.name }}<button type="button" class="chip-remove" @click="removeAmenity(i)">×</button></span></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn-outline" @click="showAddRoomModal = false">Cancel</button><button type="submit" class="btn-primary" :disabled="roomFormLoading">{{ roomFormLoading ? 'Creating…' : 'Create Room' }}</button></div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ════════════ RECORD PAYMENT MODAL ════════════ -->
    <Transition name="modal-fade">
      <div v-if="showPaymentModal" class="modal-overlay" @click.self="closePaymentModal">
        <div class="modal-box" role="dialog" aria-modal="true" aria-label="Record Payment">
          <div class="modal-hdr"><h2 class="modal-title">Record Payment</h2><button class="modal-close" @click="closePaymentModal">✕</button></div>
          <div v-if="paymentError" class="form-error">{{ paymentError }}</div>
          <div v-if="paymentSuccess" style="margin:0 24px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;color:#166534;font-size:12.5px;">{{ paymentSuccess }}</div>
          <div class="modal-form">
            <div class="form-group"><label>Tenant <span class="req">*</span></label><select v-model="paymentForm.tenant_id" class="form-input" @change="onPaymentTenantChange"><option value="">— Select tenant —</option><option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.full_name }}</option></select></div>
            <div class="form-row">
              <div class="form-group"><label>Lease ID <span class="req">*</span></label><input v-model="paymentForm.lease_id" type="text" class="form-input" placeholder="Auto-filled" /></div>
              <div class="form-group"><label>Room ID <span class="req">*</span></label><input v-model="paymentForm.room_id" type="text" class="form-input" placeholder="Auto-filled" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Amount (₱) <span class="req">*</span></label><input v-model.number="paymentForm.amount" type="number" min="1" step="0.01" class="form-input" /></div>
              <div class="form-group"><label>Type</label><select v-model="paymentForm.type" class="form-input"><option value="RENT">Rent</option><option value="DEPOSIT">Deposit</option><option value="ADVANCE">Advance</option><option value="UTILITY">Utility</option><option value="OTHER">Other</option></select></div>
              <div class="form-group"><label>Method</label><select v-model="paymentForm.method" class="form-input"><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="GCASH">GCash</option><option value="OTHER">Other</option></select></div>
            </div>
            <div class="form-group"><label>Reference No.</label><input v-model="paymentForm.reference_no" type="text" class="form-input" placeholder="Optional" /></div>
            <div class="form-row">
              <div class="form-group"><label>Period Start</label><input v-model="paymentForm.period_start" type="date" class="form-input" /></div>
              <div class="form-group"><label>Period End</label><input v-model="paymentForm.period_end" type="date" class="form-input" /></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea v-model="paymentForm.notes" class="form-textarea" rows="2" placeholder="Optional notes…"></textarea></div>
            <div class="modal-footer"><button type="button" class="btn-outline" @click="closePaymentModal">Cancel</button><button type="button" class="btn-primary" :disabled="paymentLoading" @click="submitPayment">{{ paymentLoading ? 'Recording…' : 'Record Payment' }}</button></div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.shell { display: flex; height: 100vh; width: 100%; background: #f3f0fb; overflow: hidden; }
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.content { flex: 1; overflow-y: auto; padding: 26px 28px; }
.error-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 10px 14px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 10px; font-size: 13px; }
.error-bar button { background: none; border: none; cursor: pointer; color: #991b1b; font-size: 15px; }
.page-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.page-title { font-size: 24px; font-weight: 800; color: #160d27; margin: 0 0 4px; letter-spacing: -.03em; }
.page-sub { font-size: 13px; color: #9ca3af; margin: 0; }
.hdr-actions { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
.btn-outline { border: 1px solid #e0ddf7; background: #fff; color: #374151; border-radius: 9px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: border-color .15s; }
.btn-outline:hover { border-color: #ae68fa; color: #ae68fa; }
.btn-primary { border: none; background: linear-gradient(135deg, #ae68fa, #f1966e); color: #fff; border-radius: 9px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-primary:hover { opacity: .9; }
.loading-bar { text-align: center; color: #ae68fa; font-size: 13px; margin-bottom: 12px; }
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
.mini-stat { background: #fff; border: 1px solid #e0ddf7; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.mini-stat span { font-size: 12px; color: #9ca3af; }
.mini-stat strong { font-size: 20px; font-weight: 800; color: #160d27; }
.mini-stat strong.danger { color: #dc2626; }
.panels-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.panel { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 12px rgba(149,132,226,.06); }
.panel.mt16 { margin-top: 14px; }
.panel-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.panel-title { font-size: 13px; font-weight: 700; color: #160d27; }
.panel-link { background: none; border: none; font-size: 12px; font-weight: 600; color: #ae68fa; cursor: pointer; font-family: inherit; }
.panel-link:hover { color: #f1966e; }
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
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; }
.badge-paid       { background: #dcfce7; color: #166534; }
.badge-occupied   { background: #d1fae5; color: #065f46; }
.badge-reserved   { background: #fef3c7; color: #92400e; }
.badge-unpaid     { background: #fee2e2; color: #991b1b; }
.badge-partial    { background: #fef3c7; color: #92400e; }
.badge-inprogress { background: #fef9c3; color: #854d0e; }
.badge-assigned   { background: #ccfbf1; color: #0f766e; }
.badge-pending    { background: #fee2e2; color: #991b1b; }
.badge-done       { background: #f0fdf4; color: #166534; }
.mq-list { display: flex; flex-direction: column; gap: 10px; }
.mq-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mq-body { min-width: 0; flex: 1; }
.mq-title { margin: 0; font-size: 12.5px; font-weight: 600; color: #160d27; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mq-sub { margin: 2px 0 0; font-size: 11px; color: #9ca3af; }
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
.search-input { flex: 1; min-width: 220px; padding: 8px 12px; border: 1px solid #e0ddf7; border-radius: 9px; font-size: 13px; font-family: inherit; background: #faf7ff; }
.search-input::placeholder { color: #c4b8e8; }
.action-btn { padding: 4px 10px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; margin-right: 4px; font-family: inherit; }
.action-btn.approve  { background: #dcfce7; color: #166534; }
.action-btn.reject   { background: #fee2e2; color: #991b1b; }
.action-btn.outline  { background: #f3f0fb; color: #6b7280; border: 1px solid #e0ddf7; }
.action-btn.view     { background: #eff6ff; color: #2563eb; border-radius: 8px; padding: 5px 14px; font-size: 12px; }
.action-btn.confirm  { background: linear-gradient(135deg, #ae68fa, #f1966e); color: #fff; }
.action-btn.unassign { background: #fee2e2; color: #991b1b; }
.td-actions { white-space: nowrap; }
@media (max-width: 1200px) { .panels-row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .stats-grid.mini { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px)  { .panels-row { grid-template-columns: 1fr; } .page-hdr { flex-direction: column; gap: 12px; } }
@media (max-width: 600px)  { .stats-grid { grid-template-columns: 1fr; } .content { padding: 16px; } }
.modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(22, 13, 39, .55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal-box { background: #fff; border-radius: 18px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(22,13,39,.28); display: flex; flex-direction: column; }
.modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; flex-shrink: 0; }
.modal-title { font-size: 18px; font-weight: 800; color: #160d27; margin: 0; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: #f3f0fb; color: #160d27; }
.modal-form { padding: 18px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row:has(.form-group:nth-child(3)) { grid-template-columns: 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 11.5px; font-weight: 600; color: #6b7280; }
.form-input { padding: 8px 10px; border: 1.5px solid #e0ddf7; border-radius: 9px; font-size: 13px; font-family: inherit; background: #faf7ff; color: #160d27; transition: border-color .15s; }
.form-input:focus { outline: none; border-color: #ae68fa; }
.form-textarea { padding: 8px 10px; border: 1.5px solid #e0ddf7; border-radius: 9px; font-size: 13px; font-family: inherit; background: #faf7ff; color: #160d27; resize: vertical; }
.form-textarea:focus { outline: none; border-color: #ae68fa; }
.req { color: #ef4444; }
.form-error { margin: 0 24px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 9px; color: #991b1b; font-size: 12.5px; }
.amenity-input-row { display: flex; gap: 8px; align-items: center; }
.amenity-input-row .form-input { flex: 1; }
.amenity-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.amenity-chip { display: inline-flex; align-items: center; gap: 5px; background: #ede9fb; color: #5b2d9e; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
.chip-remove { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 14px; line-height: 1; padding: 0; display: flex; align-items: center; }
.chip-remove:hover { color: #ef4444; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; border-top: 1px solid #f3f0fb; margin-top: 4px; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* ── Revenue Chart ─────────────────────────── */
.rev-chart { padding: 8px 0 0; }
.rev-bars { display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; height: 150px; padding: 0 8px; }
.rev-col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
.rev-bar-pair { display: flex; align-items: flex-end; gap: 4px; height: 130px; }
.rev-bar { width: 18px; border-radius: 4px 4px 0 0; transition: height .3s ease; }
.rev-target { background: #d1d5db; }
.rev-actual { background: #6366f1; }
.rev-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.rev-legend { display: flex; justify-content: center; gap: 18px; margin-top: 12px; font-size: 11px; color: #6b7280; }
.rev-leg-item { display: flex; align-items: center; gap: 5px; }
.rev-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

/* ── Occupancy Breakdown ────────────────────── */
.occ-wrap { display: flex; align-items: center; gap: 20px; padding: 8px 0; }
.occ-donut-box { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
.occ-donut { width: 100%; height: 100%; }
.occ-center-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.occ-pct { font-size: 22px; font-weight: 800; color: #160d27; line-height: 1; }
.occ-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.occ-types { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.occ-type-row { display: flex; align-items: center; gap: 8px; }
.occ-type-name { font-size: 12px; font-weight: 600; color: #374151; width: 60px; flex-shrink: 0; }
.occ-type-bar-wrap { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.occ-type-bar { height: 100%; background: #6366f1; border-radius: 4px; transition: width .3s ease; }
.occ-type-pct { font-size: 12px; font-weight: 700; color: #374151; width: 36px; text-align: right; }
@media (max-width: 900px) { .charts-row { grid-template-columns: 1fr !important; } .occ-wrap { flex-direction: column; } }
.action-btn.danger { background: #fee2e2; color: #991b1b; }
</style>

<style>
.view-modal-overlay { position:fixed;inset:0;background:rgba(17,24,39,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:24px; }
.view-modal-card    { position:relative;width:100%;max-width:480px;background:#fff;border-radius:24px;padding:32px 36px 28px;box-shadow:0 24px 64px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:12px;max-height:90vh;overflow-y:auto; }
.view-modal-close   { position:absolute;top:14px;right:16px;background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer; }
.view-modal-close:hover { color:#111827; }
.view-modal-hdr     { text-align:center; }
.view-modal-hdr h2  { font-size:20px;font-weight:800;color:#111827;margin:0 0 4px; }
.view-modal-hdr p   { font-size:13px;color:#6b7280;margin:0; }
.vg  { display:flex;flex-direction:column;gap:8px; }
.vrow { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
.vf  { display:flex;flex-direction:column;gap:2px;padding:9px 13px;background:#f9fafb;border-radius:10px; }
.vfl { font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em; }
.vfv { font-size:14px;color:#111827;font-weight:500; }
.vsec-label { font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 6px;padding-left:2px; }
.vbadge { display:inline-block;margin-top:6px;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700; }
.vbadge-pending  { background:#fef3c7;color:#92400e; }
.vbadge-approved { background:#dcfce7;color:#166534; }
.vbadge-rejected { background:#fee2e2;color:#991b1b; }
.vbadge-cancelled{ background:#f3f4f6;color:#6b7280; }
.vbtn-approve { flex:1;padding:10px;border-radius:999px;border:none;background:#dcfce7;color:#16a34a;font-size:14px;font-weight:600;cursor:pointer; }
.vbtn-reject  { flex:1;padding:10px;border-radius:999px;border:none;background:#fee2e2;color:#dc2626;font-size:14px;font-weight:600;cursor:pointer; }
</style>