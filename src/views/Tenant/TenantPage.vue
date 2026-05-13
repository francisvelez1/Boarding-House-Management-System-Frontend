<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from "vue";
import { useAuthStore } from '../../stores/auth'
import LeaseCard from '../../components/TenantsUI_Components/LeaseCard.vue'
import PaymentsCard from '../../components/TenantsUI_Components/PaymentsCard.vue'
import MaintenanceCard from '../../components/TenantsUI_Components/MaintenanceCard.vue'
import MessagesCard from '../../components/TenantsUI_Components/MessageCard.vue'
import Tenant_MyRoom       from './Tenant_MyRoom.vue'
import Tenant_Payments     from './Tenant_Payments.vue'
import Tenant_Maintenance  from './Tenant_Maintenance.vue'
import Tenant_Messages     from './Tenant_Messages.vue'
import Hero           from '@/components/layout/Hero.vue'
import FilterBar      from '@/components/layout/FilterBar.vue'
import SidebarFilters from '@/components/layout/SidebarFilters.vue'
import RoomsGrid      from '@/components/layout/RoomsGrid.vue'
import { getTenant, getRoom, getLease, getPayments, getMaintenanceRequests, getMessages, markThreadRead, markNotificationRead, initiatePaypalPayment, recordCashPayment } from "../../services/tenantService";
import { getTenantMessages, getThread, sendMessage, getMyManager } from "../../services/messageService";
import { maintenanceService } from "../../services/maintenanceService";
import { bookingService }      from '../../services/bookingService'
import { managerRequestService, type ManagerRoleRequestItem } from '../../services/managerRequestService'
import { authService } from '../../services/authService'
import { notificationService, type NotificationItem } from '../../services/notificationService'
import type { Room } from '../../models/room'
import { isAvailable, TYPE_LABEL } from '../../models/room'
import router from "../../router";

const auth = useAuthStore()

const username = auth.user?.username ?? 'Tenant'
const initials = username.slice(0, 2).toUpperCase()

const tenant = ref<any>(null);
const room   = ref<any>(null);
const lease = ref<any>(null);
const payments = ref<any[]>([]);
const maintenanceRequests = ref<any[]>([]);
const messages = ref<any[]>([]);
const loading = ref(true) 
const error = ref('')     
const activeSection = ref('home')

function floorShort(fl: string): string {
  const map: Record<string, string> = {
    GROUND: 'Ground', SECOND: '2nd', THIRD: '3rd', FOURTH: '4th', FIFTH: '5th',
  }
  return map[fl] ?? fl
}

// ─── Data shape transformers (backend → component props) ──────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const leaseForCard = computed(() => {
  if (!lease.value) return null
  const l = lease.value
  const start = new Date(l.start_date)
  const end   = new Date(l.end_date)
  const today = new Date()
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44
  const totalMonths  = l.duration_months || Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerMonth))
  const monthsCompleted = Math.min(totalMonths, Math.max(0, Math.floor((today.getTime() - start.getTime()) / msPerMonth)))
  const statusMap: Record<string, 'Active' | 'Inactive' | 'Expired'> = {
    ACTIVE: 'Active', EXPIRED: 'Expired', TERMINATED: 'Expired', PENDING: 'Inactive', RENEWED: 'Inactive',
  }
  const roomLabel = room.value
    ? `Room ${room.value.room_number} — ${TYPE_LABEL[room.value.room_type as keyof typeof TYPE_LABEL] ?? room.value.room_type}`
    : l.room_id?.slice(0, 8) ?? '—'
  return {
    room: roomLabel,
    monthlyRent: l.monthly_rate,
    leaseStart: fmtDate(l.start_date),
    leaseEnd:   fmtDate(l.end_date),
    monthsCompleted,
    totalMonths,
    status: statusMap[l.status] ?? 'Inactive',
  }
})

const TYPE_LABEL_PAY: Record<string, string> = {
  RENT: 'rent', DEPOSIT: 'Security deposit', ADVANCE: 'Advance payment',
  PENALTY: 'Penalty fee', UTILITY: 'Utility bill',
}

const paymentsForCard = computed(() => {
  return payments.value.map((p: any, i: number) => {
    const isPaid   = p.status === 'CONFIRMED'
    const isFailed = p.status === 'FAILED' || p.status === 'REFUNDED'
    const periodDt = p.period_start ? new Date(p.period_start) : new Date(p.payment_date || p.created_at)
    const month    = periodDt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const typeSuffix = TYPE_LABEL_PAY[p.type] ?? (p.type ?? 'Payment')
    const label   = p.type === 'RENT' ? `${month} ${typeSuffix}` : typeSuffix
    const paidAt  = p.confirmed_at || p.payment_date
    const dueAt   = p.period_end   || p.payment_date
    const dueOrPaidDate = isPaid
      ? `Paid ${fmtDate(paidAt)}`
      : isFailed
        ? `Failed ${fmtDate(p.payment_date)}`
        : `Due ${fmtDate(dueAt)}`
    return {
      id:           i,
      rawId:        p.id,
      label,
      dueOrPaidDate,
      amount:       p.amount,
      status:       isPaid ? 'Paid' : 'Unpaid',
      method:       p.method ?? '',
      receiptNo:    p.receipt_number ?? '',
    }
  })
})

const maintenanceForCard = computed(() => {
  const statusMap: Record<string, 'In progress' | 'Done' | 'Pending'> = {
    SUBMITTED: 'Pending', ASSIGNED: 'In progress', IN_PROGRESS: 'In progress',
    COMPLETED: 'Done', CLOSED: 'Done', REJECTED: 'Done',
  }
  return maintenanceRequests.value.map((r: any, i: number) => {
    const d = new Date(r.created_at)
    const submittedDate = `Submitted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    return {
      id:            i,
      title:         r.title,
      submittedDate,
      status:        statusMap[r.status] ?? 'Pending',
    }
  })
})

const messagesForCard = computed(() => {
  return messages.value.map((m: any, i: number) => {
    const ts  = m.created_at
    const d   = ts ? new Date(ts) : new Date()
    const now = new Date()
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000)
    let time: string
    if (diffH < 1)       time = 'Just now'
    else if (diffH < 24) time = `${diffH}h ago`
    else if (diffH < 48) time = 'Yesterday'
    else                  time = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const senderName = m.sender_name ||
      (m.direction === 'MANAGEMENT_TO_TENANT' ? 'ResidEase Admin' : 'Tenant')
    return {
      id:       i,
      rawId:    m.id,
      threadId: m.thread_id,
      senderName,
      subject:  m.subject ?? undefined,
      preview:  m.body || '',
      time,
      isUnread: m.status === 'UNREAD' || !m.read_at,
    }
  })
})

const hasBooking    = ref(false)
const managerBanner = ref('')
const rejectedManagerReq = ref<ManagerRoleRequestItem | null>(null)
const showLogoutConfirm  = ref(false)
const rejectedBooking = ref<{ room_number?: string; reason: string } | null>(null)
const showRejectedManagerNotice = ref(false)

// ─── Room browsing state (Home section) ────────────────────────────────────────────────────
const rooms          = ref<Room[]>([])
const roomsLoading   = ref(true)
const searchQuery    = ref('')
const searchPrice    = ref('')
const selectedType   = ref('All')
const selectedStatus = ref('All')
const priceMin         = ref(2000)
const priceMax         = ref(15000)
const checkedTypes     = ref<string[]>([])
const checkedAmenities = ref<string[]>([])
const checkedFloors    = ref<string[]>([])
const sortOption       = ref('Price low to high')
const showNotifPanel     = ref(false)
const notifications      = ref<NotificationItem[]>([])
const unreadCount        = ref(0)

const showBookingModal   = ref(false)
const showAlreadyBooked  = ref(false)
const bookingRoom        = ref<Room | null>(null)
const bookingError       = ref('')
const bookingSuccess     = ref('')
const bookingLoading     = ref(false)
const bookingForm      = reactive({
  full_name: '', last_name: '', email: '', phone: '',
  address: '', city: '', province: '',
  desired_move_in_date: '', message: '',
  date_of_birth: '', gender: '', civil_status: '', nationality: 'Filipino',
  occupation: '', employer: '', monthly_income: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  id_document: '',
})

const availableCount = computed(() => rooms.value.filter(isAvailable).length)

const filteredRooms = computed(() => {
  let list = [...rooms.value]
  if (selectedType.value !== 'All')   list = list.filter(r => r.room_type === selectedType.value)
  if (selectedStatus.value !== 'All') list = list.filter(r => r.status === selectedStatus.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.room_number.toLowerCase().includes(q))
  }
  if (searchPrice.value) {
    const parts = searchPrice.value.split('-').map(Number)
    list = list.filter(r => r.monthly_rate >= (parts[0]??0) && r.monthly_rate <= (parts[1]??Infinity))
  }
  list = list.filter(r => r.monthly_rate >= priceMin.value && r.monthly_rate <= priceMax.value)
  if (checkedTypes.value.length)     list = list.filter(r => checkedTypes.value.includes(r.room_type))
  if (checkedAmenities.value.length) list = list.filter(r => checkedAmenities.value.every(a => r.amenities.some(ra => ra.name===a && ra.is_working)))
  if (checkedFloors.value.length)    list = list.filter(r => r.floor_level && checkedFloors.value.includes(r.floor_level))
  if (sortOption.value === 'Price low to high') list.sort((a,b) => a.monthly_rate - b.monthly_rate)
  if (sortOption.value === 'Price high to low') list.sort((a,b) => b.monthly_rate - a.monthly_rate)
  return list
})

async function fetchRooms() {
  try {
    const res = await fetch('/api/rooms/public/vacant')
    const json = await res.json()
    rooms.value = Array.isArray(json.data) ? json.data : []
  } catch { rooms.value = [] } finally { roomsLoading.value = false }
}

function resetFilters() {
  priceMin.value = 2000; priceMax.value = 15000
  checkedTypes.value = []; checkedAmenities.value = []; checkedFloors.value = []
  selectedType.value = 'All'; selectedStatus.value = 'All'
}

function openBookingFromRoom(room: Room) {
  if (rejectedManagerReq.value) {
    showRejectedManagerNotice.value = true
    return
  }
  if (hasBooking.value) {
    showAlreadyBooked.value = true
    return
  }
  bookingRoom.value = room
  bookingError.value = ''; bookingSuccess.value = ''
  Object.assign(bookingForm, {
    full_name: username, last_name: '', email: '', phone: '',
    address: '', city: '', province: '',
    desired_move_in_date: '', message: '',
    date_of_birth: '', gender: '', civil_status: '', nationality: 'Filipino',
    occupation: '', employer: '', monthly_income: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    id_document: '',
  })
  showBookingModal.value = true
}

async function submitBooking() {
  if (!bookingRoom.value) return
  bookingError.value = ''; bookingLoading.value = true
  try {
    const res = await bookingService.apply({
      room_id:              bookingRoom.value.id,
      full_name:            bookingForm.full_name,
      last_name:            bookingForm.last_name || undefined,
      email:                bookingForm.email,
      phone:                bookingForm.phone,
      address:              bookingForm.address,
      city:                 bookingForm.city || undefined,
      province:             bookingForm.province || undefined,
      desired_move_in_date: bookingForm.desired_move_in_date || undefined,
      message:              bookingForm.message || undefined,
      date_of_birth:        bookingForm.date_of_birth || undefined,
      gender:               bookingForm.gender || undefined,
      civil_status:         bookingForm.civil_status || undefined,
      nationality:          bookingForm.nationality || 'Filipino',
      occupation:           bookingForm.occupation || undefined,
      employer:             bookingForm.employer || undefined,
      monthly_income:       bookingForm.monthly_income ? Number(bookingForm.monthly_income) : undefined,
      emergency_contact_name:         bookingForm.emergency_contact_name || undefined,
      emergency_contact_phone:        bookingForm.emergency_contact_phone || undefined,
      emergency_contact_relationship: bookingForm.emergency_contact_relationship || undefined,
      id_document:                    bookingForm.id_document || undefined,
    })
    bookingSuccess.value = res.message
  } catch (err: any) {
    bookingError.value = err?.message || 'Failed to submit booking.'
  } finally {
    bookingLoading.value = false
  }
}


// ── Maintenance form ─────────────────────────────────────────────────────────
const showMaintModal = ref(false)
const maintForm = reactive({
  room_id: '',
  title: '',
  description: '',
  category: 'OTHER' as 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'APPLIANCE' | 'PEST' | 'CLEANING' | 'SECURITY' | 'OTHER',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
})
const maintLoading = ref(false)
const maintError = ref('')
const maintSuccess = ref('')

onMounted(async () => {
  fetchRooms()

  try {
    const [t, l, p, m, msg, bookings, managerReqs] = await Promise.allSettled([
      getTenant(),
      getLease(),
      getPayments(),
      getMaintenanceRequests(),
      getMessages(),
      bookingService.getMyBookings(),
      managerRequestService.getMyRequests(),
    ])

    if (t.status   === 'fulfilled') tenant.value              = t.value
    if (l.status   === 'fulfilled') lease.value               = l.value
    if (p.status   === 'fulfilled') payments.value            = p.value ?? []
    if (m.status   === 'fulfilled') maintenanceRequests.value = m.value ?? []
    if (msg.status === 'fulfilled') messages.value            = msg.value ?? []

    // Fetch room details for hero stats and lease card
    const roomId = tenant.value?.room_id || lease.value?.room_id
    if (roomId) {
      getRoom(roomId).then(r => { room.value = r }).catch(() => {})
    }

    // Load full inbox (all messages, not just unread)
    if (tenant.value?.id) {
      getTenantMessages(String(tenant.value.id))
        .then(all => {
          messages.value = all
          unreadCount.value = all.filter((m: any) => m.status === 'UNREAD' && m.direction === 'MANAGEMENT_TO_TENANT').length
        }).catch(() => {})
    }

    // Resolve manager user_id so tenant can always send messages
    getMyManager()
      .then(id => { managerIdRef.value = id })
      .catch(() => {})

    if (bookings.status === 'fulfilled') {
      const list = (bookings.value as any)?.bookings ?? []
      const approved = list.some((b: any) => b.status === 'APPROVED')
      if (approved || lease.value) hasBooking.value = true
      // Show rejection banner for the most recent rejected booking
      const rejected = list.filter((b: any) => b.status === 'REJECTED')
        .sort((a: any, z: any) => new Date(z.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (rejected && !hasBooking.value) {
        rejectedBooking.value = {
          room_number: rejected.room_number,
          reason: rejected.review_notes || 'No reason provided.',
        }
      }
    }
    if (lease.value) hasBooking.value = true

    if (managerReqs.status === 'fulfilled') {
      const approved = managerReqs.value.requests?.find((r: any) => r.status === 'APPROVED')
      if (approved) {
        managerBanner.value = 'Your Manager Application was approved! Log out and log back in to access the Manager Portal.'
      }
      const rejected = managerReqs.value.requests?.find((r: any) => r.status === 'REJECTED')
      if (rejected) {
        rejectedManagerReq.value = rejected
      }
    }

    // Load notifications (non-blocking)
    notificationService.getUnread(10).then(n => { notifications.value = n; unreadCount.value = n.length }).catch(() => {})

  } catch (err: any) {
    error.value = err?.message || 'Failed to load dashboard.'
  } finally {
    loading.value = false
  }
})

// ── Greeting logic ─────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── Event handlers ─────────────────────────────────────────────────────────────

const payNowLoading = ref(false)

// ── Payment modal state ────────────────────────────────────────────────────
const showPayModal   = ref(false)
const payModalAmount = ref(0)
const payMethod      = ref<'choose' | 'paypal' | 'cash'>('choose')
const cashRefNo      = ref('')
const cashLoading    = ref(false)
const cashError      = ref('')
const paySuccess     = ref('')

function openPayModal(amount: number) {
  payModalAmount.value = amount
  payMethod.value      = 'choose'
  cashRefNo.value      = ''
  cashError.value      = ''
  paySuccess.value     = ''
  showPayModal.value   = true
}

function closePayModal() {
  showPayModal.value = false
  cashError.value    = ''
  paySuccess.value   = ''
}

// Called by PaymentsCard @pay-now or by "Pay rent" button
async function handlePayNow(amount: number) {
  openPayModal(amount)
}

// ── PayPal path ────────────────────────────────────────────────────────────
async function handlePaypalPay() {
  if (payNowLoading.value) return
  if (!lease.value || !tenant.value) {
    cashError.value = 'Lease or tenant data not loaded yet.'
    return
  }
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  try {
    payNowLoading.value = true
    const result = await initiatePaypalPayment({
      tenant_id:    String(tenant.value.id),
      lease_id:     String(lease.value.id),
      room_id:      String(lease.value.room_id),
      amount:       payModalAmount.value,
      type:         'RENT',
      period_start: periodStart,
      period_end:   periodEnd,
    })
    if (result?.approval_url) {
      window.location.href = result.approval_url
    } else {
      cashError.value = 'Payment initiated but no redirect URL returned.'
    }
  } catch (e: any) {
    cashError.value = e?.response?.data?.message ?? e.message ?? 'Payment initiation failed.'
  } finally {
    payNowLoading.value = false
  }
}

// ── Cash path ──────────────────────────────────────────────────────────────
async function handleCashPay() {
  if (cashLoading.value) return
  if (!lease.value || !tenant.value) {
    cashError.value = 'Lease or tenant data not loaded yet.'
    return
  }
  cashError.value = ''
  cashLoading.value = true
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  try {
    await recordCashPayment({
      tenant_id:    String(tenant.value.id),
      lease_id:     String(lease.value.id),
      room_id:      String(lease.value.room_id),
      amount:       payModalAmount.value,
      type:         'RENT',
      method:       'CASH',
      reference_no: cashRefNo.value.trim() || undefined,
      period_start: periodStart,
      period_end:   periodEnd,
    })
    paySuccess.value = 'Cash payment recorded! Your manager will confirm it shortly.'
    // Refresh payments list
    const updated = await getPayments()
    payments.value = updated
  } catch (e: any) {
    cashError.value = e?.response?.data?.detail ?? e?.response?.data?.message ?? e.message ?? 'Failed to record payment.'
  } finally {
    cashLoading.value = false
  }
}

function handleSubmitMaintenance() {
  maintError.value = ''
  maintSuccess.value = ''
  maintForm.room_id = tenant.value?.room_id ?? ''
  maintForm.title = ''
  maintForm.description = ''
  maintForm.category = 'OTHER'
  maintForm.priority = 'MEDIUM'
  showMaintModal.value = true
}

function closeMaintModal() {
  showMaintModal.value = false
  maintError.value = ''
  maintSuccess.value = ''
}

async function submitMaintenance() {
  maintError.value = ''
  maintSuccess.value = ''
  maintLoading.value = true
  try {
    const res = await maintenanceService.submit({
      room_id: maintForm.room_id,
      title: maintForm.title,
      description: maintForm.description,
      category: maintForm.category,
      priority: maintForm.priority,
    })
    maintSuccess.value = res.message
    // Refresh maintenance list
    const updated = await maintenanceService.getMyRequests()
    maintenanceRequests.value = updated.requests ?? []
  } catch (err: any) {
    maintError.value = err?.message || 'Failed to submit maintenance request.'
  } finally {
    maintLoading.value = false
  }
}

async function handleOpenMessage(id: number) {
  const msg = messagesForCard.value[id]
  if (!msg) return
  scrollTo('messages')
  if (msg.threadId) {
    openThread(msg.threadId)
    markThreadRead(msg.threadId).then(() => {
      refreshMessages()
    }).catch(() => {})
  }
}

// ── Messaging state ────────────────────────────────────────────────────────

// Manager user_id — loaded from API, with message fallback
const managerIdRef = ref('')
const managerId = computed<string>(() => {
  if (managerIdRef.value) return managerIdRef.value
  // Fallback: derive from any existing MANAGEMENT_TO_TENANT message
  const mgmtMsg = messages.value.find((m: any) => m.direction === 'MANAGEMENT_TO_TENANT')
  return mgmtMsg ? mgmtMsg.sender_id : ''
})

// Group messages by thread, show latest per thread
const inboxThreads = computed(() => {
  const threadMap: Record<string, any> = {}
  for (const m of messages.value) {
    const tid = m.thread_id ?? m.id
    if (!threadMap[tid] || new Date(m.created_at) > new Date(threadMap[tid].created_at)) {
      threadMap[tid] = m
    }
  }
  return Object.values(threadMap).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
})

// ── Compose modal ──────────────────────────────────────────────────────────
const showComposeModal  = ref(false)
const composeSubject    = ref('')
const composeBody       = ref('')
const composeLoading    = ref(false)
const composeError      = ref('')
const composeSuccess    = ref('')

function openCompose() {
  composeSubject.value = ''
  composeBody.value    = ''
  composeError.value   = ''
  composeSuccess.value = ''
  showComposeModal.value = true
}

function closeCompose() {
  showComposeModal.value = false
}

async function submitCompose() {
  if (!composeBody.value.trim()) { composeError.value = 'Message cannot be empty.'; return }
  if (!tenant.value?.id) { composeError.value = 'Tenant data not loaded.'; return }
  if (!managerId.value) { composeError.value = 'No management contact found. Please wait for management to message you first.'; return }
  composeError.value   = ''
  composeLoading.value = true
  try {
    await sendMessage({
      receiver_id: managerId.value,
      tenant_id:   String(tenant.value.id),
      body:        composeBody.value.trim(),
      subject:     composeSubject.value.trim() || undefined,
      direction:   'TENANT_TO_MANAGEMENT',
    })
    composeSuccess.value = 'Message sent to management!'
    await refreshMessages()
  } catch (e: any) {
    composeError.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to send message.'
  } finally {
    composeLoading.value = false
  }
}

// ── Thread view modal ──────────────────────────────────────────────────────
const showThreadModal  = ref(false)
const activeThread     = ref<any>(null)
const threadMsgs       = ref<any[]>([])
const threadLoading    = ref(false)
const replyBody        = ref('')
const replyLoading     = ref(false)
const replyError       = ref('')
const replySuccess     = ref('')

async function openThread(threadId: string) {
  showThreadModal.value = true
  threadLoading.value   = true
  replyBody.value       = ''
  replyError.value      = ''
  replySuccess.value    = ''
  try {
    const data = await getThread(threadId)
    activeThread.value = data
    threadMsgs.value   = data.messages ?? []
    // mark as read
    if (tenant.value?.user_id) {
      markThreadRead(threadId).catch(() => {})
    }
  } catch (e: any) {
    replyError.value = 'Failed to load conversation.'
  } finally {
    threadLoading.value = false
  }
}

function closeThread() {
  showThreadModal.value = false
  activeThread.value    = null
  threadMsgs.value      = []
}

async function submitReply() {
  if (!replyBody.value.trim()) { replyError.value = 'Reply cannot be empty.'; return }
  if (!tenant.value?.id || !managerId.value) { replyError.value = 'Cannot send reply.'; return }
  replyError.value   = ''
  replyLoading.value = true
  try {
    await sendMessage({
      receiver_id: managerId.value,
      tenant_id:   String(tenant.value.id),
      body:        replyBody.value.trim(),
      direction:   'TENANT_TO_MANAGEMENT',
      thread_id:   activeThread.value?.thread_id,
    })
    replySuccess.value = 'Reply sent!'
    replyBody.value    = ''
    // Refresh thread
    const data = await getThread(activeThread.value.thread_id)
    threadMsgs.value   = data.messages ?? []
    await refreshMessages()
  } catch (e: any) {
    replyError.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to send reply.'
  } finally {
    replyLoading.value = false
  }
}

async function refreshMessages() {
  if (!tenant.value?.id) return
  try {
    const all = await getTenantMessages(String(tenant.value.id))
    messages.value = all
    unreadCount.value = all.filter((m: any) => m.status === 'UNREAD' && m.direction === 'MANAGEMENT_TO_TENANT').length
  } catch { /* silent */ }
}

function handleLogout() {
  if (rejectedManagerReq.value) {
    showLogoutConfirm.value = true
    return
  }
  auth.logout()
  router.push('/')
}

async function confirmLogoutDelete() {
  showLogoutConfirm.value = false
  try {
    await authService.deleteAccount()
  } catch (e: any) {
    console.error('Failed to delete account:', e?.message)
  }
  auth.logout()
  router.push('/')
}

function cancelLogoutDelete() {
  showLogoutConfirm.value = false
  auth.logout()
  router.push('/')
}

function handleSwitchToManager() {
  auth.logout()
  window.location.href = '/'
}

function toggleNotifPanel() { showNotifPanel.value = !showNotifPanel.value }

async function markAllRead() {
  await notificationService.markAllAsRead().catch(() => {})
  notifications.value.forEach(n => { n.is_read = true })
  unreadCount.value = 0
}

async function handleNotifClick(n: NotificationItem) {
  if (!n.is_read) {
    markNotificationRead(n.id).catch(() => {})
    n.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

const lockedSections = ['my-room', 'payments', 'maintenance', 'messages']

function scrollTo(sectionId: string) {
  if (lockedSections.includes(sectionId) && !hasBooking.value) return
  activeSection.value = sectionId
  const el = document.getElementById(sectionId)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onScroll() {
  const sections = ['home', 'my-room', 'payments', 'maintenance', 'messages']
  for (const id of sections) {
    const el = document.getElementById(id) as HTMLElement | null
    if (el && el.offsetHeight > 0) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 100) activeSection.value = id
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  window.addEventListener('click', () => { showNotifPanel.value = false })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="dashboard">

    <!-- ── Navbar (light, picture 1 style) ───────────────────────────────── -->
    <nav class="navbar">
      <div class="navbar__brand">
        <span class="navbar__icon">🏠</span>
        <span class="navbar__name">ResidEase</span>
      </div>
      <div class="navbar__links">
        <a :class="['navbar__link', activeSection === 'home' ? 'navbar__link--active' : '']"
           @click.prevent="scrollTo('home')" href="#">Home</a>

        <a :class="['navbar__link', !hasBooking ? 'navbar__link--locked' : '', activeSection === 'my-room' ? 'navbar__link--active' : '']"
           @click.prevent="hasBooking && scrollTo('my-room')" href="#" data-tooltip="Locked — book a room first">
          My room <span v-if="!hasBooking" class="lock-icon">🔒</span>
        </a>

        <a :class="['navbar__link', !hasBooking ? 'navbar__link--locked' : '', activeSection === 'payments' ? 'navbar__link--active' : '']"
           @click.prevent="hasBooking && scrollTo('payments')" href="#" data-tooltip="Locked — book a room first">
          Payments <span v-if="!hasBooking" class="lock-icon">🔒</span>
        </a>

        <a :class="['navbar__link', !hasBooking ? 'navbar__link--locked' : '', activeSection === 'maintenance' ? 'navbar__link--active' : '']"
           @click.prevent="hasBooking && scrollTo('maintenance')" href="#" data-tooltip="Locked — book a room first">
          Maintenance <span v-if="!hasBooking" class="lock-icon">🔒</span>
        </a>

        <a :class="['navbar__link', !hasBooking ? 'navbar__link--locked' : '', activeSection === 'messages' ? 'navbar__link--active' : '']"
           @click.prevent="hasBooking && scrollTo('messages')" href="#" data-tooltip="Locked — book a room first">
          Messages <span v-if="!hasBooking" class="lock-icon">🔒</span>
        </a>
      </div>
      <div class="navbar__user">
        <div class="notif-wrap">
          <button class="navbar__notif-btn" @click.stop="toggleNotifPanel" title="Notifications">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
          </button>
          <!-- Notification dropdown -->
          <div v-if="showNotifPanel" class="notif-panel" @click.stop>
            <div class="notif-panel__hdr">
              <span class="notif-panel__title">Notifications</span>
              <button v-if="unreadCount > 0" class="notif-panel__mark-all" @click="markAllRead">Mark all read</button>
            </div>
            <div v-if="notifications.length === 0" class="notif-panel__empty">No new notifications</div>
            <div
              v-for="n in notifications"
              :key="n.id"
              class="notif-item"
              :class="{ 'notif-item--unread': !n.is_read }"
              @click="handleNotifClick(n)"
            >
              <div class="notif-item__title">{{ n.title }}</div>
              <div class="notif-item__msg">{{ n.message }}</div>
              <div class="notif-item__time">{{ new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</div>
            </div>
          </div>
        </div>
        <div class="navbar__avatar">{{ initials }}</div>
        <span class="navbar__username">{{ username }}</span>
        <button class="navbar__logout-btn" @click="handleLogout">Logout</button>
      </div>
    </nav>

    <!-- ── Booking rejected banner ───────────────────────────────────────── -->
    <div v-if="rejectedBooking" class="rejected-banner">
      <div class="banner-content">
        <span class="banner-icon">❌</span>
        <div class="banner-text">
          <strong>Booking Rejected{{ rejectedBooking.room_number ? ` — Room ${rejectedBooking.room_number}` : '' }}</strong>
          <p class="banner-hint">Reason: {{ rejectedBooking.reason }}</p>
        </div>
      </div>
      <div class="banner-actions">
        <button class="banner-browse" @click="rejectedBooking = null; scrollTo('home')">Browse Other Rooms →</button>
        <button class="banner-dismiss" @click="rejectedBooking = null">Dismiss</button>
      </div>
    </div>

    <!-- ── Manager approved banner ─────────────────────────────────────────── -->
    <div v-if="managerBanner" class="manager-banner">
      <div class="banner-content">
        <span class="banner-icon">🎉</span>
        <div class="banner-text">
          <strong>Congratulations!</strong> {{ managerBanner }}
          <p class="banner-hint">You must log out and log back in to access the Manager Portal.</p>
        </div>
      </div>
      <div class="banner-actions">
        <button class="banner-switch" @click="handleSwitchToManager">Switch to Manager Portal →</button>
        <button class="banner-dismiss" @click="managerBanner = ''">Dismiss</button>
      </div>
    </div>

    <!-- ── Manager rejected banner ─────────────────────────────────────────── -->
    <div v-if="rejectedManagerReq" class="manager-banner" style="background: linear-gradient(90deg, #ef4444, #dc2626);">
      <div class="banner-content">
        <span class="banner-icon">❌</span>
        <div class="banner-text">
          <strong>Manager Application Rejected</strong>
          <p class="banner-hint">{{ rejectedManagerReq.review_notes ? rejectedManagerReq.review_notes : 'Your manager application was not approved. Your account will be deleted when you log out.' }}</p>
        </div>
      </div>
      <div class="banner-actions">
        <button class="banner-dismiss" @click="rejectedManagerReq = null">Dismiss</button>
      </div>
    </div>

    <!-- ── HOME SECTION (room browsing) ───────────────────────────────────────── -->
    <div v-show="activeSection === 'home'" id="home">
      <Hero
        v-model:search-location="searchQuery"
        v-model:search-price="searchPrice"
        :available-count="availableCount"
        @search="() => {}"
      />
      <FilterBar
        v-model:selected-type="selectedType"
        v-model:selected-status="selectedStatus"
      />
      <div class="main-content">
        <SidebarFilters
          v-model:price-min="priceMin"
          v-model:price-max="priceMax"
          v-model:checked-types="checkedTypes"
          v-model:checked-amenities="checkedAmenities"
          v-model:checked-floors="checkedFloors"
          @reset="resetFilters"
        />
        <RoomsGrid
          :rooms="filteredRooms"
          :loading="roomsLoading"
          v-model:sort-option="sortOption"
          @inquire="openBookingFromRoom"
          @clear-filters="resetFilters"
        />
      </div>
    </div>

    <!-- ── DASHBOARD SECTIONS (locked if no booking) ───────────────────────────── -->
    <template v-if="activeSection !== 'home'">
      <div v-if="!hasBooking" class="locked-screen">
        <div class="locked-card">
          <div class="locked-icon">🔒</div>
          <h2>No Active Booking</h2>
          <p>You need an approved booking to access this section.</p>
          <button class="btn-browse" @click="scrollTo('home')">Browse Available Rooms</button>
        </div>
      </div>

      <template v-else>
        <!-- Loading -->
        <div v-if="loading" class="loading-screen"><p>Loading your dashboard…</p></div>
        <div v-else-if="error" class="error-screen"><p>⚠️ {{ error }}</p></div>
        <template v-else>
          <!-- MY ROOM -->
          <Tenant_MyRoom
            v-show="activeSection === 'my-room'"
            :tenant="tenant"
            :room="room"
            :username="username"
            :greeting="getGreeting()"
            :lease-for-card="leaseForCard"
            :lease="lease"
            :payments-for-card="paymentsForCard"
            :pay-now-loading="payNowLoading"
            :maintenance-for-card="maintenanceForCard"
            :messages-for-card="messagesForCard"
            :floor-short="floorShort"
            @pay-now="handlePayNow"
            @open-pay-modal="openPayModal"
            @submit-maintenance="handleSubmitMaintenance"
            @open-message="handleOpenMessage"
            @scroll-to="scrollTo"
          />

          <!-- PAYMENTS -->
          <Tenant_Payments
            v-show="activeSection === 'payments'"
            :payments-for-card="paymentsForCard"
            :pay-now-loading="payNowLoading"
            :lease="lease"
            @pay-now="handlePayNow"
            @open-pay-modal="openPayModal"
            @scroll-to="scrollTo"
          />

          <!-- MAINTENANCE -->
          <Tenant_Maintenance
            v-show="activeSection === 'maintenance'"
            :maintenance-for-card="maintenanceForCard"
            @submit-new="handleSubmitMaintenance"
          />

          <!-- MESSAGES -->
          <Tenant_Messages
            v-show="activeSection === 'messages'"
            :inbox-threads="inboxThreads"
            @open-compose="openCompose"
            @open-thread="openThread"
          />
        </template>
      </template>
    </template>

    <!-- ── Rejected Manager Application Notice ─────────────────────────── -->
    <Teleport to="body">
      <div v-if="showRejectedManagerNotice" class="modal-overlay" @click.self="showRejectedManagerNotice = false">
        <div class="modal-card" style="max-width:400px;text-align:center">
          <button class="modal-close" @click="showRejectedManagerNotice = false">✕</button>
          <div style="font-size:48px;margin-bottom:12px">🚫</div>
          <h2 style="font-size:18px;font-weight:800;color:#1f2937;margin:0 0 8px">Cannot Book a Room</h2>
          <p style="font-size:14px;color:#6b7280;margin:0 0 6px">Your <strong>Manager Role Application</strong> was rejected by the admin.</p>
          <p style="font-size:13px;color:#9ca3af;margin:0 0 20px">{{ rejectedManagerReq?.review_notes ? 'Reason: ' + rejectedManagerReq.review_notes : 'Please contact the admin for more information.' }}</p>
          <button class="btn-primary" style="background:#ef4444" @click="showRejectedManagerNotice = false">Close</button>
        </div>
      </div>
    </Teleport>

    <!-- ── Already Booked Notice ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showAlreadyBooked" class="modal-overlay" @click.self="showAlreadyBooked = false">
        <div class="modal-card" style="max-width:380px;text-align:center">
          <button class="modal-close" @click="showAlreadyBooked = false">✕</button>
          <div style="font-size:48px;margin-bottom:12px">🏠</div>
          <h2 style="font-size:18px;font-weight:800;color:#1f2937;margin:0 0 8px">You Already Have a Booking</h2>
          <p style="font-size:14px;color:#6b7280;margin:0 0 20px">You can only have one active booking at a time. Please manage your current room before booking another.</p>
          <button class="btn-primary" @click="() => { showAlreadyBooked = false; scrollTo('my-room') }">View My Room</button>
        </div>
      </div>
    </Teleport>

    <!-- ── Booking Request Modal (Home section) ──────────────────────────── -->
    <Teleport to="body">
      <div v-if="showBookingModal" class="modal-overlay" @click.self="showBookingModal = false">
        <div class="modal-card">
          <button class="modal-close" @click="showBookingModal = false">✕</button>
          <template v-if="!bookingSuccess">
            <div class="modal-header">
              <h2>Book Room {{ bookingRoom?.room_number }}</h2>
              <p class="modal-sub">₱{{ bookingRoom?.monthly_rate?.toLocaleString() }}/mo &mdash; {{ bookingRoom?.room_type }}</p>
            </div>
            <p class="form-section-title">Personal Information</p>
            <div class="field-row">
              <div class="field"><label>First Name</label><input v-model="bookingForm.full_name" type="text" class="input" /></div>
              <div class="field"><label>Last Name</label><input v-model="bookingForm.last_name" type="text" class="input" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Email</label><input v-model="bookingForm.email" type="email" class="input" /></div>
              <div class="field"><label>Phone</label><input v-model="bookingForm.phone" type="text" class="input" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Date of Birth</label><input v-model="bookingForm.date_of_birth" type="date" class="input" /></div>
              <div class="field"><label>Gender</label>
                <select v-model="bookingForm.gender" class="input">
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div class="field-row">
              <div class="field"><label>Civil Status</label>
                <select v-model="bookingForm.civil_status" class="input">
                  <option value="">Select</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="DIVORCED">Divorced</option>
                </select>
              </div>
              <div class="field"><label>Nationality</label><input v-model="bookingForm.nationality" type="text" class="input" /></div>
            </div>
            <p class="form-section-title">Address &amp; Move-in</p>
            <div class="field"><label>Home Address</label><input v-model="bookingForm.address" type="text" class="input" /></div>
            <div class="field-row">
              <div class="field"><label>City</label><input v-model="bookingForm.city" type="text" class="input" /></div>
              <div class="field"><label>Province</label><input v-model="bookingForm.province" type="text" class="input" /></div>
            </div>
            <div class="field"><label>Desired Move-in Date</label><input v-model="bookingForm.desired_move_in_date" type="date" class="input" /></div>
            <p class="form-section-title">Occupation</p>
            <div class="field-row">
              <div class="field"><label>Occupation</label><input v-model="bookingForm.occupation" type="text" class="input" placeholder="e.g. Student, Employee" /></div>
              <div class="field"><label>Employer / School</label><input v-model="bookingForm.employer" type="text" class="input" /></div>
            </div>
            <div class="field"><label>Monthly Income <span style="color:#9ca3af;font-weight:400">(optional)</span></label><input v-model="bookingForm.monthly_income" type="number" class="input" placeholder="₱" /></div>
            <p class="form-section-title">Emergency Contact</p>
            <div class="field-row">
              <div class="field"><label>Contact Name</label><input v-model="bookingForm.emergency_contact_name" type="text" class="input" /></div>
              <div class="field"><label>Contact Phone</label><input v-model="bookingForm.emergency_contact_phone" type="text" class="input" /></div>
            </div>
            <div class="field"><label>Relationship</label>
              <select v-model="bookingForm.emergency_contact_relationship" class="input">
                <option value="">Select</option>
                <option value="PARENT">Parent</option>
                <option value="SPOUSE">Spouse</option>
                <option value="SIBLING">Sibling</option>
                <option value="RELATIVE">Relative</option>
                <option value="FRIEND">Friend</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div class="field"><label>ID Document URL <span style="color:#9ca3af;font-weight:400">(optional — link to photo of valid ID)</span></label><input v-model="bookingForm.id_document" type="url" class="input" placeholder="https://…" /></div>
            <div class="field"><label>Message <span style="color:#9ca3af;font-weight:400">(optional)</span></label><textarea v-model="bookingForm.message" class="input" rows="2"></textarea></div>
            <p v-if="bookingError" class="msg error">{{ bookingError }}</p>
            <button class="btn-primary" :disabled="bookingLoading" @click="submitBooking">{{ bookingLoading ? 'Submitting…' : 'Submit Booking Request' }}</button>
          </template>
          <template v-else>
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Request Sent!</h2>
              <p>{{ bookingSuccess }}</p>
              <button class="btn-close" @click="showBookingModal = false">Close</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ── Maintenance Request Modal ──────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showMaintModal" class="modal-overlay" @click.self="closeMaintModal">
        <div class="modal-card">
          <button class="modal-close" @click="closeMaintModal">✕</button>

          <template v-if="!maintSuccess">
            <div class="modal-header">
              <h2>Submit Maintenance Request</h2>
              <p class="modal-sub">Describe the issue and we'll handle it promptly.</p>
            </div>

            <div class="field">
              <label>Room ID</label>
              <input v-model="maintForm.room_id" type="text" placeholder="Room identifier" class="input" />
            </div>
            <div class="field">
              <label>Title</label>
              <input v-model="maintForm.title" type="text" placeholder="e.g. Leaking faucet" class="input" />
            </div>
            <div class="field">
              <label>Category</label>
              <select v-model="maintForm.category" class="input">
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="CARPENTRY">Carpentry</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="PEST">Pest</option>
                <option value="CLEANING">Cleaning</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div class="field">
              <label>Priority</label>
              <select v-model="maintForm.priority" class="input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div class="field">
              <label>Description</label>
              <textarea v-model="maintForm.description" rows="3" placeholder="Describe the issue in detail..." class="input"></textarea>
            </div>

            <p v-if="maintError" class="msg error">{{ maintError }}</p>

            <button class="btn-primary" :disabled="maintLoading" @click="submitMaintenance">
              {{ maintLoading ? 'Submitting…' : 'Submit Request' }}
            </button>
          </template>

          <template v-else>
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Request Sent!</h2>
              <p>{{ maintSuccess }}</p>
              <button class="btn-close" @click="closeMaintModal">Close</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ── Logout Confirmation (rejected manager request) ─────────────────── -->
    <Teleport to="body">
      <div v-if="showLogoutConfirm" class="modal-overlay" @click.self="cancelLogoutDelete">
        <div class="modal-card" style="max-width: 420px; text-align: center;">
          <button class="modal-close" @click="cancelLogoutDelete">✕</button>
          <div class="modal-header" style="align-items: center;">
            <div style="font-size: 40px; margin-bottom: 8px;">⚠️</div>
            <h2>Account Will Be Deleted</h2>
            <p class="modal-sub">Your manager application was rejected.</p>
          </div>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin: 8px 0;">
            This account will not be active anymore and it has been rejected for manager request.
            Logging out will permanently delete your account.
          </p>
          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button class="btn-primary" style="background: linear-gradient(90deg, #ef4444, #dc2626); flex: 1;" @click="confirmLogoutDelete">
              Delete Account &amp; Logout
            </button>
            <button class="btn-outline" style="flex: 1; padding: 12px; border-radius: 999px; border: 1px solid #e0ddf7; background: #fff; cursor: pointer; font-weight: 600; color: #374151;" @click="cancelLogoutDelete">
              Just Logout
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Compose Message Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showComposeModal" class="modal-overlay" @click.self="closeCompose">
        <div class="modal-card" style="max-width:480px">
          <button class="modal-close" @click="closeCompose">✕</button>
          <template v-if="!composeSuccess">
            <div class="modal-header">
              <h2>New Message</h2>
              <p class="modal-sub">Send a message to management</p>
            </div>
            <div class="field">
              <label>Subject <span style="color:#9ca3af;font-weight:400">(optional)</span></label>
              <input v-model="composeSubject" type="text" class="input" placeholder="e.g. Lease inquiry" />
            </div>
            <div class="field">
              <label>Message</label>
              <textarea v-model="composeBody" rows="5" class="input" placeholder="Write your message here…" style="resize:vertical"></textarea>
            </div>
            <p v-if="composeError" class="msg error">{{ composeError }}</p>
            <button class="btn-primary" :disabled="composeLoading" @click="submitCompose">
              {{ composeLoading ? 'Sending…' : '📨 Send Message' }}
            </button>
          </template>
          <template v-else>
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Message Sent!</h2>
              <p>{{ composeSuccess }}</p>
              <button class="btn-close" @click="closeCompose">Close</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ── Thread View Modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showThreadModal" class="modal-overlay" @click.self="closeThread">
        <div class="modal-card" style="max-width:520px">
          <button class="modal-close" @click="closeThread">✕</button>
          <div class="modal-header">
            <h2>Conversation</h2>
            <p class="modal-sub">{{ activeThread?.messages?.[0]?.subject ?? 'Direct message' }}</p>
          </div>

          <div v-if="threadLoading" style="text-align:center;padding:20px;color:#9ca3af">Loading…</div>

          <div v-else class="thread-msgs">
            <div
              v-for="(m, i) in threadMsgs"
              :key="i"
              class="thread-bubble"
              :class="m.direction === 'TENANT_TO_MANAGEMENT' ? 'thread-bubble--mine' : 'thread-bubble--theirs'"
            >
              <div class="thread-bubble-name">
                {{ m.direction === 'TENANT_TO_MANAGEMENT' ? 'You' : (m.sender_name ?? 'Management') }}
              </div>
              <div class="thread-bubble-body">{{ m.body }}</div>
              <div class="thread-bubble-time">
                {{ new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
          </div>

          <!-- Reply box -->
          <div class="thread-reply" v-if="!threadLoading">
            <textarea v-model="replyBody" rows="3" class="input" placeholder="Write a reply…" style="resize:none"></textarea>
            <p v-if="replyError" class="msg error" style="margin-top:6px">{{ replyError }}</p>
            <p v-if="replySuccess" class="msg" style="background:#dcfce7;color:#166534;margin-top:6px">{{ replySuccess }}</p>
            <button class="btn-primary" :disabled="replyLoading" @click="submitReply" style="margin-top:8px">
              {{ replyLoading ? 'Sending…' : '↩ Reply' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>


    <Teleport to="body">
      <div v-if="showPayModal" class="modal-overlay" @click.self="closePayModal">
        <div class="modal-card" style="max-width: 420px;">
          <button class="modal-close" @click="closePayModal">✕</button>

          <!-- SUCCESS STATE -->
          <template v-if="paySuccess">
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Payment Recorded!</h2>
              <p>{{ paySuccess }}</p>
              <button class="btn-close" @click="closePayModal">Close</button>
            </div>
          </template>

          <!-- CHOOSE METHOD -->
          <template v-else-if="payMethod === 'choose'">
            <div class="modal-header">
              <h2>Pay Rent</h2>
              <p class="modal-sub">Amount: <strong>₱{{ payModalAmount.toLocaleString() }}</strong> — Choose how you'd like to pay</p>
            </div>
            <div class="pay-method-grid">
              <button class="pay-method-btn" @click="payMethod = 'paypal'">
                <span class="pay-method-icon">🌐</span>
                <span class="pay-method-label">PayPal</span>
                <span class="pay-method-hint">Secure online payment</span>
              </button>
              <button class="pay-method-btn" @click="payMethod = 'cash'">
                <span class="pay-method-icon">💵</span>
                <span class="pay-method-label">Cash / GCash</span>
                <span class="pay-method-hint">Record manual payment</span>
              </button>
            </div>
          </template>

          <!-- PAYPAL CONFIRM -->
          <template v-else-if="payMethod === 'paypal'">
            <div class="modal-header">
              <h2>Pay via PayPal</h2>
              <p class="modal-sub">You'll be redirected to PayPal to complete the payment of <strong>₱{{ payModalAmount.toLocaleString() }}</strong>.</p>
            </div>
            <p v-if="cashError" class="msg error">{{ cashError }}</p>
            <button class="btn-primary" :disabled="payNowLoading" @click="handlePaypalPay">
              {{ payNowLoading ? 'Redirecting…' : '🌐 Continue to PayPal' }}
            </button>
            <button class="btn-back" @click="payMethod = 'choose'">← Back</button>
          </template>

          <!-- CASH FORM -->
          <template v-else-if="payMethod === 'cash'">
            <div class="modal-header">
              <h2>Cash / Manual Payment</h2>
              <p class="modal-sub">Recording payment of <strong>₱{{ payModalAmount.toLocaleString() }}</strong>. Your manager will confirm it.</p>
            </div>
            <div class="field">
              <label>Reference No. <span style="color:#9ca3af;font-weight:400">(optional — GCash ref, bank ref, etc.)</span></label>
              <input v-model="cashRefNo" type="text" class="input" placeholder="e.g. GC-20260511-XYZ" />
            </div>
            <p v-if="cashError" class="msg error">{{ cashError }}</p>
            <button class="btn-primary" :disabled="cashLoading" @click="handleCashPay">
              {{ cashLoading ? 'Recording…' : '💵 Record Cash Payment' }}
            </button>
            <button class="btn-back" @click="payMethod = 'choose'">← Back</button>
          </template>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
/* ── Layout ──────────────────────────────────────────────────── */
.dashboard {
  min-height: 100vh;
  background: #f4f5f7;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #1a1a1a;
}

/* ── Navbar (light theme) ────────────────────────────────────────────────── */
.navbar {
  display: flex; align-items: center; gap: 8px;
  background: #ffffff; padding: 0 32px; height: 60px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
  position: sticky; top: 0; z-index: 50;
}
.navbar__brand { display: flex; align-items: center; gap: 8px; margin-right: 16px; }
.navbar__icon { font-size: 20px; }
.navbar__name { font-size: 17px; font-weight: 800; color: #1f2937; }
.navbar__links { display: flex; gap: 2px; flex: 1; }
.navbar__link {
  font-size: 14px; font-weight: 500; color: #6b7280;
  text-decoration: none; padding: 7px 16px; border-radius: 8px;
  transition: background .15s, color .15s; cursor: pointer; display: flex; align-items: center; gap: 5px;
}
.navbar__link:hover { color: #111827; background: #f3f4f6; }
.navbar__link--active { color: #111827; font-weight: 700; background: #f3f4f6; border-bottom: 2px solid #111827; border-radius: 8px 8px 0 0; }
.navbar__link--locked { color: #d1d5db; cursor: not-allowed; position: relative; }
.navbar__link--locked:hover { background: none; color: #d1d5db; }
.lock-icon { font-size: 11px; }

/* ── Locked tooltip ────── */
.navbar__link--locked[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
}
.navbar__link--locked[data-tooltip]::before {
  content: '';
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: #1f2937;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s;
  z-index: 200;
}
.navbar__link--locked[data-tooltip]:hover::after,
.navbar__link--locked[data-tooltip]:hover::before { opacity: 1; }
.navbar__user { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.navbar__notif-btn {
  background: none; border: none; cursor: pointer; color: #6b7280;
  padding: 6px; border-radius: 8px; display: flex; align-items: center;
  transition: color .15s, background .15s;
}
.navbar__notif-btn:hover { color: #111827; background: #f3f4f6; }
.navbar__avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.navbar__username { font-size: 14px; color: #1f2937; font-weight: 600; }
.navbar__logout-btn {
  background: none; border: 1px solid #e5e7eb; color: #6b7280;
  font-size: 13px; font-weight: 500; padding: 6px 12px;
  border-radius: 8px; cursor: pointer; transition: border-color .15s, color .15s;
}
.navbar__logout-btn:hover { border-color: #ef4444; color: #ef4444; }

/* ── Rejected booking banner ───────────────────────────────────────── */
.rejected-banner {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  color: #fff;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.banner-browse {
  background: #fff; color: #dc2626; font-size: 12px; font-weight: 700;
  padding: 7px 16px; border-radius: 20px; border: none; cursor: pointer;
  transition: transform .1s, box-shadow .15s;
}
.banner-browse:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }

/* ── Manager banner ────────────────────────────────────────────────── */
.manager-banner {
  background: linear-gradient(90deg, #4ade80, #22c55e);
  color: #fff;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.banner-icon { font-size: 24px; }
.banner-text { font-size: 13px; font-weight: 600; line-height: 1.4; }
.banner-hint { font-size: 12px; font-weight: 500; opacity: .9; margin: 2px 0 0; }
.banner-actions { display: flex; align-items: center; gap: 10px; }
.banner-switch {
  background: #fff; color: #15803d; font-size: 12px; font-weight: 700;
  padding: 7px 16px; border-radius: 20px; border: none; cursor: pointer;
  transition: transform .1s, box-shadow .15s;
}
.banner-switch:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
.banner-dismiss {
  background: rgba(255,255,255,.2); color: #fff; font-size: 12px; font-weight: 600;
  padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,.4);
  cursor: pointer; transition: background .15s;
}
.banner-dismiss:hover { background: rgba(255,255,255,.35); }

/* ── Main content (home section grid) ────────────────────────────── */
.main-content { display: flex; gap: 32px; padding: 40px 80px 80px; position: relative; }
@media (max-width: 900px) { .main-content { flex-direction: column; padding: 24px; } }

/* ── Dashboard hero (My Room section) ────────────────────────────── */
.hero-dash {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  padding: 28px 32px; display: flex; justify-content: space-between; align-items: center;
}
.hero-dash__left h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 4px; }
.hero-dash__left p  { font-size: 13px; color: #a5b4fc; margin: 0; }
.hero-dash__stats { display: flex; gap: 12px; }
.hero-dash__stat {
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15);
  border-radius: 10px; padding: 10px 18px;
  display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 80px;
}
.stat-label { font-size: 11px; color: #a5b4fc; text-transform: uppercase; letter-spacing: .04em; }
.stat-value { font-size: 18px; font-weight: 700; color: #fff; }
.stat-value--green { font-size: 13px; color: #4ade80; }

/* Light hero (matches screenshot) */
.hero-dash--light {
  background: #ffffff;
  border-bottom: 1px solid #ede9fe;
}
.hero-dash--light .hero-dash__left h1 { color: #1e1b4b; }
.hero-dash--light .hero-dash__left p  { color: #6b7280; }
.hero-dash--light .hero-dash__stat {
  background: #fff; border: 1px solid #e0ddf7;
  box-shadow: 0 2px 8px rgba(129,140,248,.1);
}
.hero-dash--light .stat-label { color: #9ca3af; }
.hero-dash--light .stat-value { color: #4c1d95; }
.hero-dash--light .stat-value--green { color: #16a34a; }

/* My Room 3-column grid */
.my-room-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  align-items: start;
}
.my-room-col { min-width: 0; }

/* Empty state card (Picture 2 style) */
.empty-card {
  background: #fff;
  border: 1px solid #e9e6f5;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.empty-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.empty-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}
.empty-card__viewall {
  font-size: 13px;
  color: #7c3aed;
  font-weight: 500;
  cursor: pointer;
}
.empty-card__msg {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 28px 0;
  margin: 0;
}

/* ── Locked screen ────────────────────────────────────────────────── */
.locked-screen {
  min-height: 60vh; display: flex; align-items: center; justify-content: center;
}
.locked-card {
  text-align: center; padding: 40px;
  background: #fff; border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
  max-width: 380px;
}
.locked-icon { font-size: 48px; margin-bottom: 16px; }
.locked-card h2 { font-size: 20px; font-weight: 800; color: #1f2937; margin: 0 0 8px; }
.locked-card p  { color: #6b7280; font-size: 14px; margin: 0 0 20px; }
.btn-browse {
  padding: 10px 24px; border-radius: 999px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.empty-section  { color: #9ca3af; padding: 32px; text-align: center; font-size: 14px; }

/* ── Notification panel ──────────────────────────────────────────────── */
.notif-wrap { position: relative; }
.notif-badge {
  position: absolute; top: -4px; right: -4px;
  background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.notif-panel {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: 320px; background: #fff;
  border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,.14);
  border: 1px solid #f0f0f0; z-index: 300; overflow: hidden;
  animation: slideUp .15s ease;
}
.notif-panel__hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px; border-bottom: 1px solid #f3f4f6;
}
.notif-panel__title { font-size: 14px; font-weight: 700; color: #1f2937; }
.notif-panel__mark-all {
  font-size: 12px; color: #6b7280; background: none; border: none; cursor: pointer;
}
.notif-panel__mark-all:hover { color: #111827; }
.notif-panel__empty { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }
.notif-item {
  padding: 12px 16px; border-bottom: 1px solid #f9fafb;
  transition: background .1s;
}
.notif-item:hover { background: #f9fafb; }
.notif-item--unread { background: #faf5ff; border-left: 3px solid #ae68fa; }
.notif-item__title { font-size: 13px; font-weight: 600; color: #1f2937; }
.notif-item__msg   { font-size: 12px; color: #6b7280; margin-top: 2px; }
.notif-item__time  { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.loading-screen { min-height: 60vh; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 15px; }
.error-screen   { min-height: 60vh; display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 15px; }

/* ── Content ─────────────────────────────────────────────────── */
.content {
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

#my-room { background: #f5f3ff; min-height: calc(100vh - 60px); }
#payments, #maintenance, #messages { background: #f5f3ff; min-height: calc(100vh - 60px); }

.section--full {
  width: 100%;
}

.section--two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .my-room-grid { grid-template-columns: 1fr 1fr; }
  .my-room-col:first-child { grid-column: 1 / -1; }
}
@media (max-width: 768px) {
  .section--two-col {
    grid-template-columns: 1fr;
  }

  .my-room-grid { grid-template-columns: 1fr; }
  .my-room-col--lease { grid-column: auto; }

  .hero-dash {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .navbar__links {
    display: none;
  }
}


/* ── Modal ──────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(17,24,39,.45);
  backdrop-filter: blur(4px); display: flex; align-items: center;
  justify-content: center; z-index: 100; padding: 24px;
}
.modal-card {
  position: relative; width: 100%; max-width: 480px; background: #fff; border-radius: 28px;
  padding: 36px 40px 32px; box-shadow: 0 32px 80px rgba(149,132,226,.3);
  border: 1px solid rgba(210,196,255,.7); display: flex; flex-direction: column;
  gap: 14px; animation: slideUp .2s ease; overflow-y: auto; max-height: 90vh;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.modal-close {
  position: absolute; top: 16px; right: 18px;
  background: none; border: none; font-size: 18px; line-height: 1;
  color: #9ca3af; cursor: pointer; padding: 4px 6px; border-radius: 8px;
  transition: color .15s, background .15s;
}
.modal-close:hover { color: #111827; background: #f3f4f6; }
.modal-header { display: flex; flex-direction: column; gap: 4px; }
.modal-header h2 { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
.modal-sub { font-size: 14px; color: #6b7280; margin: 0; }
.form-section-title {
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: #7c3aed; margin: 4px 0 -4px; padding-bottom: 6px; border-bottom: 1px solid #ede9fe;
}
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; color: #4b5563; font-weight: 500; }
.input {
  width: 100%; border-radius: 24px; border: 1px solid #e0ddf7;
  padding: 11px 16px; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s; background: #fff; font-family: inherit;
}
.input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.18); }
.msg { font-size: 13px; padding: 10px 14px; border-radius: 10px; }
.error   { background: #fee2e2; color: #dc2626; }
.btn-primary {
  width: 100%; padding: 12px; border-radius: 999px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.btn-primary:hover    { opacity: .9; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.success-state { text-align: center; padding: 20px 0; }
.success-icon  { font-size: 48px; margin-bottom: 16px; }
.success-state h2 { font-size: 22px; font-weight: 800; color: #1f2937; margin-bottom: 8px; }
.success-state p  { color: #6b7280; margin-bottom: 24px; }
/* ── Messaging inbox ─────────────────────────────────────────────── */
.msg-inbox-card {
  background: #fff; border: 1px solid #e9e6f5; border-radius: 16px; overflow: hidden;
}
.msg-inbox-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #f3f0fb;
}
.msg-inbox-title { font-size: 15px; font-weight: 700; color: #111827; }
.btn-compose {
  background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff;
  border: none; border-radius: 999px; padding: 7px 16px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.btn-compose:hover { opacity: .9; }

.msg-thread-list { display: flex; flex-direction: column; }
.msg-thread-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid #f9f7ff;
  cursor: pointer; transition: background .1s; position: relative;
}
.msg-thread-item:hover { background: #faf7ff; }
.msg-thread-item--unread { background: #fdf8ff; }
.msg-thread-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.msg-thread-body { flex: 1; min-width: 0; }
.msg-thread-top { display: flex; justify-content: space-between; align-items: center; }
.msg-thread-sender { font-size: 13px; font-weight: 700; color: #1f2937; }
.msg-thread-time   { font-size: 11px; color: #9ca3af; }
.msg-thread-subject { font-size: 12px; font-weight: 600; color: #4b5563; margin-top: 2px; }
.msg-thread-preview {
  font-size: 12px; color: #9ca3af; margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.msg-unread-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #ae68fa;
  flex-shrink: 0; margin-top: 5px;
}
.msg-empty {
  padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;
}
.btn-compose-empty {
  margin-top: 12px; padding: 9px 20px; border-radius: 999px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
}

/* ── Thread bubble view ──────────────────────────────────────────── */
.thread-msgs {
  max-height: 320px; overflow-y: auto; display: flex; flex-direction: column;
  gap: 12px; padding: 4px 0 8px;
}
.thread-bubble {
  max-width: 78%; display: flex; flex-direction: column; gap: 3px;
}
.thread-bubble--mine   { align-self: flex-end; align-items: flex-end; }
.thread-bubble--theirs { align-self: flex-start; align-items: flex-start; }
.thread-bubble-name  { font-size: 11px; font-weight: 600; color: #9ca3af; }
.thread-bubble-body  {
  padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5;
}
.thread-bubble--mine   .thread-bubble-body { background: linear-gradient(135deg,#ae68fa,#f1966e); color:#fff; border-bottom-right-radius: 4px; }
.thread-bubble--theirs .thread-bubble-body { background: #f3f0fb; color: #1f2937; border-bottom-left-radius: 4px; }
.thread-bubble-time  { font-size: 10px; color: #c4b8e8; }
.thread-reply { border-top: 1px solid #f3f0fb; padding-top: 14px; margin-top: 4px; }

.btn-pay-rent {
  width: 100%; padding: 12px; border-radius: 999px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: opacity .15s; margin-top: 8px;
}
.btn-pay-rent:hover { opacity: .9; }

.pay-method-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;
}
.pay-method-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 20px 12px; border-radius: 16px; border: 2px solid #e0ddf7;
  background: #faf7ff; cursor: pointer; transition: border-color .15s, background .15s;
}
.pay-method-btn:hover { border-color: #ae68fa; background: #f3eeff; }
.pay-method-icon  { font-size: 28px; }
.pay-method-label { font-size: 14px; font-weight: 700; color: #1f2937; }
.pay-method-hint  { font-size: 11px; color: #9ca3af; }

.btn-back {
  width: 100%; padding: 10px; border-radius: 999px; border: 1px solid #e0ddf7;
  background: #fff; color: #6b7280; font-size: 14px; font-weight: 500;
  cursor: pointer; margin-top: 4px; transition: background .15s;
}
.btn-back:hover { background: #f9f7ff; }
.btn-close {
  padding: 8px 24px; border-radius: 24px;
  background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; border: none;
  font-weight: 600; font-size: 14px; cursor: pointer;
}
</style>
