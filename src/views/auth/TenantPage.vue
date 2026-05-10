<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from "vue";
import { useAuthStore } from '../../stores/auth'
import LeaseCard from '../../components/TenantsUI_Components/LeaseCard.vue'
import PaymentsCard from '../../components/TenantsUI_Components/PaymentsCard.vue'
import MaintenanceCard from '../../components/TenantsUI_Components/MaintenanceCard.vue'
import MessagesCard from '../../components/TenantsUI_Components/MessageCard.vue'
import Hero           from '@/components/layout/Hero.vue'
import FilterBar      from '@/components/layout/FilterBar.vue'
import SidebarFilters from '@/components/layout/SidebarFilters.vue'
import RoomsGrid      from '@/components/layout/RoomsGrid.vue'
import { getTenant, getLease, getPayments, getMaintenanceRequests, getMessages } from "../../services/tenantService";
import { maintenanceService } from "../../services/maintenanceService";
import { bookingService }      from '../../services/bookingService'
import { managerRequestService, type ManagerRoleRequestItem } from '../../services/managerRequestService'
import { authService } from '../../services/authService'
import { notificationService, type NotificationItem } from '../../services/notificationService'
import type { Room } from '../../models/room'
import { isAvailable } from '../../models/room'
import router from "../../router";

const auth = useAuthStore()

const username = auth.user?.username ?? 'Tenant'
const initials = username.slice(0, 2).toUpperCase()

const tenant = ref<any>(null);
const lease = ref<any>(null);
const payments = ref<any[]>([]);
const maintenanceRequests = ref<any[]>([]);
const messages = ref<any[]>([]);
const loading = ref(true) 
const error = ref('')     
const activeSection = ref('home')

const hasBooking    = ref(false)
const managerBanner = ref('')
const rejectedManagerReq = ref<ManagerRoleRequestItem | null>(null)
const showLogoutConfirm  = ref(false)

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
  full_name: '', email: '', phone: '', address: '', city: '', province: '',
  desired_move_in_date: '', message: '',
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
  if (hasBooking.value) {
    showAlreadyBooked.value = true
    return
  }
  bookingRoom.value = room
  bookingError.value = ''; bookingSuccess.value = ''
  Object.assign(bookingForm, { full_name: username, email:'', phone:'', address:'', city:'', province:'', desired_move_in_date:'', message:'' })
  showBookingModal.value = true
}

async function submitBooking() {
  if (!bookingRoom.value) return
  bookingError.value = ''; bookingLoading.value = true
  try {
    const res = await bookingService.apply({
      room_id:              bookingRoom.value.id,
      full_name:            bookingForm.full_name,
      email:                bookingForm.email,
      phone:                bookingForm.phone,
      address:              bookingForm.address,
      city:                 bookingForm.city || undefined,
      province:             bookingForm.province || undefined,
      desired_move_in_date: bookingForm.desired_move_in_date || undefined,
      message:              bookingForm.message || undefined,
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

    if (bookings.status === 'fulfilled') {
      const list = (bookings.value as any)?.bookings ?? []
      const approved = list.some((b: any) => b.status === 'APPROVED')
      if (approved || lease.value) hasBooking.value = true
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

function handlePayNow(amount: number) {
  alert(`Redirecting to payment gateway for ₱${amount.toLocaleString()}…`)
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

function handleOpenMessage(id: number) {
  alert(`Opening message ${id}…`)
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
    const el = document.getElementById(id)
    if (el) {
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
            <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ 'notif-item--unread': !n.is_read }">
              <div class="notif-item__title">{{ n.title }}</div>
              <div class="notif-item__msg">{{ n.message }}</div>
              <div class="notif-item__time">{{ new Date(n.created_at).toLocaleDateString() }}</div>
            </div>
          </div>
        </div>
        <div class="navbar__avatar">{{ initials }}</div>
        <span class="navbar__username">{{ username }}</span>
        <button class="navbar__logout-btn" @click="handleLogout">Logout</button>
      </div>
    </nav>

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
          <div v-show="activeSection === 'my-room'" id="my-room">
            <header class="hero-dash hero-dash--light">
              <div class="hero-dash__left">
                <h1>{{ getGreeting() }}, {{ tenant?.name?.split(' ')[0] ?? username }}!</h1>
                <p>Here's your boarding house overview for today.</p>
              </div>
              <div class="hero-dash__stats">
                <div class="hero-dash__stat">
                  <span class="stat-label">Your room</span>
                  <span class="stat-value stat-value--purple">{{ tenant?.room_number ?? tenant?.room ?? '—' }}</span>
                </div>
                <div class="hero-dash__stat">
                  <span class="stat-label">Floor</span>
                  <span class="stat-value stat-value--purple">{{ tenant?.floor_level ?? tenant?.floor ?? '—' }}</span>
                </div>
                <div class="hero-dash__stat">
                  <span class="stat-label">Status</span>
                  <span class="stat-value stat-value--green">{{ tenant?.status ?? 'Active' }} ✓</span>
                </div>
              </div>
            </header>
            <main class="content">
              <section class="my-room-grid">
                <div class="my-room-col my-room-col--lease">
                  <LeaseCard v-if="lease" :lease="lease" />
                  <div v-else class="empty-section">No lease information found.</div>
                </div>
                <div class="my-room-col">
                  <PaymentsCard v-if="payments.length" :payments="payments" @pay-now="handlePayNow" />
                  <div v-else class="empty-section">No payment records.</div>
                </div>
                <div class="my-room-col">
                  <MaintenanceCard :requests="maintenanceRequests" @submit-new="handleSubmitMaintenance" />
                </div>
              </section>
              <section class="section--full">
                <MessagesCard v-if="messages.length" :messages="messages" @open-message="handleOpenMessage" />
                <div v-else class="empty-section">No messages yet.</div>
              </section>
            </main>
          </div>

          <!-- PAYMENTS -->
          <div v-show="activeSection === 'payments'" id="payments">
            <main class="content">
              <section class="section--full">
                <PaymentsCard v-if="payments.length" :payments="payments" @pay-now="handlePayNow" />
                <div v-else class="empty-section">No payment records found.</div>
              </section>
            </main>
          </div>

          <!-- MAINTENANCE -->
          <div v-show="activeSection === 'maintenance'" id="maintenance">
            <main class="content">
              <section class="section--full">
                <MaintenanceCard :requests="maintenanceRequests" @submit-new="handleSubmitMaintenance" />
              </section>
            </main>
          </div>

          <!-- MESSAGES -->
          <div v-show="activeSection === 'messages'" id="messages">
            <main class="content">
              <section class="section--full">
                <MessagesCard v-if="messages.length" :messages="messages" @open-message="handleOpenMessage" />
                <div v-else class="empty-section">No messages yet.</div>
              </section>
            </main>
          </div>
        </template>
      </template>
    </template>

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
            <div class="field"><label>Full Name</label><input v-model="bookingForm.full_name" type="text" class="input" /></div>
            <div class="field"><label>Email</label><input v-model="bookingForm.email" type="email" class="input" /></div>
            <div class="field"><label>Phone</label><input v-model="bookingForm.phone" type="text" class="input" /></div>
            <div class="field"><label>Address</label><input v-model="bookingForm.address" type="text" class="input" /></div>
            <div class="field"><label>Desired Move-in Date</label><input v-model="bookingForm.desired_move_in_date" type="date" class="input" /></div>
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

  </div>
</template>

<style scoped>
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
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border-bottom: 1px solid #e0ddf7;
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
  grid-template-columns: 1.6fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.my-room-col { min-width: 0; }

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
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1100px;
  margin: 0 auto;
}

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
  .my-room-col--lease { grid-column: 1 / -1; }
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
.btn-close {
  padding: 8px 24px; border-radius: 24px;
  background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; border: none;
  font-weight: 600; font-size: 14px; cursor: pointer;
}
</style>