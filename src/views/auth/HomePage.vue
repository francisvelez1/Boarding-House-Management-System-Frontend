<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import starTrail from '@/assets/Design.png'
import logo from '../../assets/Logo.png'

import Hero           from '@/components/layout/Hero.vue'
import FilterBar      from '@/components/layout/FilterBar.vue'
import SidebarFilters from '@/components/layout/SidebarFilters.vue'
import RoomsGrid      from '@/components/layout/RoomsGrid.vue'

import { managerRequestService } from '../../services/managerRequestService'
import { bookingService } from '../../services/bookingService'

import type { Room } from '../../models/room'
import { RoomStatus, RoomType, FloorLevel, isAvailable } from '../../models/room'

const router = useRouter()
const auth   = useAuthStore()

// ─── Hero search state ────────────────────────────────────────────────────────
const searchQuery    = ref('')
const searchPrice    = ref('')
const selectedType   = ref('All')
const selectedStatus = ref('All')

// ─── Sidebar filter state ─────────────────────────────────────────────────────
const priceMin         = ref(2000)
const priceMax         = ref(15000)
const checkedTypes     = ref<string[]>([])
const checkedAmenities = ref<string[]>([])
const checkedFloors    = ref<string[]>([])
const sortOption       = ref('Price low to high')

// ─── Room data ────────────────────────────────────────────────────────────────
const rooms   = ref<Room[]>([])
const loading = ref(true)

async function fetchRooms() {
  try {
    const res = await fetch('/api/rooms/public/vacant')
    if (!res.ok) throw new Error('API error')
    const json = await res.json()
    rooms.value = Array.isArray(json.data) ? json.data : []
  } catch {
    rooms.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchRooms)

// ─── Filtered & sorted rooms ──────────────────────────────────────────────────
const filteredRooms = computed(() => {
  let list = [...rooms.value]

  if (selectedType.value !== 'All')
    list = list.filter(r => r.room_type === selectedType.value)

  if (selectedStatus.value !== 'All')
    list = list.filter(r => r.status === selectedStatus.value)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.room_number.toLowerCase().includes(q))
  }

  if (searchPrice.value) {
    const parts = searchPrice.value.split('-').map(Number)
    const lo = parts[0] ?? 0
    const hi = parts[1] ?? Infinity
    list = list.filter(r => r.monthly_rate >= lo && r.monthly_rate <= hi)
  }

  list = list.filter(r => r.monthly_rate >= priceMin.value && r.monthly_rate <= priceMax.value)

  if (checkedTypes.value.length)
    list = list.filter(r => checkedTypes.value.includes(r.room_type))

  if (checkedAmenities.value.length)
    list = list.filter(r =>
      checkedAmenities.value.every(a =>
        r.amenities.some(ra => ra.name === a && ra.is_working)
      )
    )

  if (checkedFloors.value.length)
    list = list.filter(r => r.floor_level && checkedFloors.value.includes(r.floor_level))

  if (sortOption.value === 'Price low to high') list.sort((a, b) => a.monthly_rate - b.monthly_rate)
  if (sortOption.value === 'Price high to low') list.sort((a, b) => b.monthly_rate - a.monthly_rate)
  if (sortOption.value === 'Newest first')      list.sort((a, b) => b.id.localeCompare(a.id))

  return list
})

const availableCount = computed(() => rooms.value.filter(isAvailable).length)

function resetFilters() {
  priceMin.value         = 2000
  priceMax.value         = 15000
  checkedTypes.value     = []
  checkedAmenities.value = []
  checkedFloors.value    = []
  selectedType.value     = 'All'
  selectedStatus.value   = 'All'
}

function scrollToRooms() {
  document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' })
}

function logout() {
  auth.logout()
  router.push('/')
}

// ─── Booking modal ────────────────────────────────────────────────────────────
const showBooking = ref(false)
const bookingRoom = ref<Room | null>(null)
const bookingForm = reactive({
  full_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  desired_move_in_date: '',
  message: '',
})
const bookingError   = ref('')
const bookingSuccess = ref('')
const bookingLoading = ref(false)

function openBooking(room: Room) {
  bookingRoom.value = room
  bookingError.value = ''
  bookingSuccess.value = ''
  Object.assign(bookingForm, {
    full_name: auth.user?.username ?? '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    desired_move_in_date: '',
    message: '',
  })
  showBooking.value = true
}

function closeBooking() {
  showBooking.value = false
  bookingRoom.value = null
  bookingError.value = ''
  bookingSuccess.value = ''
}

async function submitBooking() {
  if (!bookingRoom.value) return
  bookingError.value = ''
  bookingSuccess.value = ''
  bookingLoading.value = true
  try {
    const res = await bookingService.apply({
      room_id: bookingRoom.value.id,
      full_name: bookingForm.full_name,
      email: bookingForm.email,
      phone: bookingForm.phone,
      address: bookingForm.address,
      city: bookingForm.city || undefined,
      province: bookingForm.province || undefined,
      desired_move_in_date: bookingForm.desired_move_in_date || undefined,
      message: bookingForm.message || undefined,
    })
    bookingSuccess.value = res.message
  } catch (err: any) {
    bookingError.value = err?.message || 'Failed to submit booking request.'
  } finally {
    bookingLoading.value = false
  }
}

// ─── Manager request modal ────────────────────────────────────────────────────
const showManagerRequest = ref(false)
const managerForm = reactive({
  property_name: '',
  location: '',
  address: '',
  room_count: 1,
  description: '',
})
const managerError   = ref('')
const managerSuccess = ref('')
const managerLoading = ref(false)

function openManagerRequest() {
  managerError.value = ''
  managerSuccess.value = ''
  Object.assign(managerForm, {
    property_name: '',
    location: '',
    address: '',
    room_count: 1,
    description: '',
  })
  showManagerRequest.value = true
}

function closeManagerRequest() {
  showManagerRequest.value = false
  managerError.value = ''
  managerSuccess.value = ''
}

async function submitManagerRequest() {
  managerError.value = ''
  managerSuccess.value = ''
  managerLoading.value = true
  try {
    const res = await managerRequestService.apply({
      property_name: managerForm.property_name,
      location: managerForm.location,
      address: managerForm.address,
      room_count: managerForm.room_count,
      description: managerForm.description || undefined,
    })
    managerSuccess.value = res.message
  } catch (err: any) {
    managerError.value = err?.message || 'Failed to submit manager application.'
  } finally {
    managerLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <img :src="starTrail" class="bg-design" alt="">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-brand">
        <img :src="logo" alt="ResidEase" class="brand-logo" />
        <span class="brand-text">ResidEase</span>
      </div>
      <div class="topbar-actions">
        <button class="btn-manager" @click="openManagerRequest">
          Apply as Manager
        </button>
        <div class="avatar">{{ auth.user?.username?.[0]?.toUpperCase() }}</div>
        <span class="username">{{ auth.user?.username }}</span>
        <button class="logout-btn" @click="logout">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </header>

    <Hero
      v-model:search-location="searchQuery"
      v-model:search-price="searchPrice"
      :available-count="availableCount"
      @search="scrollToRooms"
    />

    <FilterBar
      v-model:selected-type="selectedType"
      v-model:selected-status="selectedStatus"
    />

    <div id="rooms-section" class="main-content">
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
        :loading="loading"
        v-model:sort-option="sortOption"
        @inquire="openBooking"
        @clear-filters="resetFilters"
      />
    </div>

    <!-- ── Booking Modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showBooking" class="modal-overlay" @click.self="closeBooking">
        <div class="modal-card booking-card">
          <button class="modal-close" @click="closeBooking">✕</button>

          <template v-if="!bookingSuccess">
            <div class="modal-header">
              <h2>Book Room {{ bookingRoom?.room_number }}</h2>
              <p class="modal-sub">Fill in your details to apply for this room.</p>
            </div>

            <div class="field">
              <label>Full name</label>
              <input v-model="bookingForm.full_name" type="text" placeholder="Your full name" class="input" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model="bookingForm.email" type="email" placeholder="your@email.com" class="input" />
            </div>
            <div class="field">
              <label>Phone</label>
              <input v-model="bookingForm.phone" type="tel" placeholder="09XX XXX XXXX" class="input" />
            </div>
            <div class="field">
              <label>Address</label>
              <input v-model="bookingForm.address" type="text" placeholder="Street, Barangay, City" class="input" />
            </div>
            <div class="name-row">
              <div class="field">
                <label>City</label>
                <input v-model="bookingForm.city" type="text" placeholder="City" class="input" />
              </div>
              <div class="field">
                <label>Province</label>
                <input v-model="bookingForm.province" type="text" placeholder="Province" class="input" />
              </div>
            </div>
            <div class="field">
              <label>Desired move-in date</label>
              <input v-model="bookingForm.desired_move_in_date" type="date" class="input" />
            </div>
            <div class="field">
              <label>Message (optional)</label>
              <textarea v-model="bookingForm.message" rows="2" placeholder="Any additional info..." class="input"></textarea>
            </div>

            <p v-if="bookingError" class="msg error">{{ bookingError }}</p>

            <button class="btn-primary" :disabled="bookingLoading" @click="submitBooking">
              {{ bookingLoading ? 'Submitting…' : 'Submit Booking Request' }}
            </button>
          </template>

          <template v-else>
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Request Sent!</h2>
              <p>{{ bookingSuccess }}</p>
              <button class="btn-close" @click="closeBooking">Close</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ── Manager Request Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showManagerRequest" class="modal-overlay" @click.self="closeManagerRequest">
        <div class="modal-card manager-card">
          <button class="modal-close" @click="closeManagerRequest">✕</button>

          <template v-if="!managerSuccess">
            <div class="modal-header">
              <h2>Apply to be a Manager</h2>
              <p class="modal-sub">Tell us about your property to get started.</p>
            </div>

            <div class="field">
              <label>Property name</label>
              <input v-model="managerForm.property_name" type="text" placeholder="e.g. Sunny Dormitory" class="input" />
            </div>
            <div class="field">
              <label>Location</label>
              <input v-model="managerForm.location" type="text" placeholder="e.g. Quezon City" class="input" />
            </div>
            <div class="field">
              <label>Full address</label>
              <input v-model="managerForm.address" type="text" placeholder="Street, Barangay, City" class="input" />
            </div>
            <div class="field">
              <label>Number of rooms</label>
              <input v-model.number="managerForm.room_count" type="number" min="1" class="input" />
            </div>
            <div class="field">
              <label>Description (optional)</label>
              <textarea v-model="managerForm.description" rows="2" placeholder="Describe your property..." class="input"></textarea>
            </div>

            <p v-if="managerError" class="msg error">{{ managerError }}</p>

            <button class="btn-primary" :disabled="managerLoading" @click="submitManagerRequest">
              {{ managerLoading ? 'Submitting…' : 'Submit Application' }}
            </button>
          </template>

          <template v-else>
            <div class="success-state">
              <div class="success-icon">✅</div>
              <h2>Application Sent!</h2>
              <p>{{ managerSuccess }}</p>
              <button class="btn-close" @click="closeManagerRequest">Close</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh; width: 100%; background: #faf7ff;
  display: flex; flex-direction: column;
  position: relative; overflow-x: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}
.bg-design {
  position: absolute; top: -100px; left: -50px;
  width: 600px; opacity: 0.8; pointer-events: none; z-index: 0;
}
.main-content {
  display: flex; gap: 32px;
  padding: 40px 80px 80px;
  z-index: 5; position: relative;
}
@media (max-width: 900px) {
  .main-content { flex-direction: column; padding: 24px; }
}

/* Topbar */
.topbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e8e4f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-brand { display:flex; align-items:center; gap:10px; }
.brand-logo   { width:32px; height:32px; }
.brand-text   { font-weight:600; font-size:16px; color:#1f2933; }

.topbar-actions { display:flex; align-items:center; gap:12px; }
.avatar {
  width:34px; height:34px;
  background: linear-gradient(135deg,#ae68fa,#f1966e);
  color:#fff; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  font-weight:700; font-size:14px;
}
.username { font-size:14px; font-weight:600; color:#374151; }
.logout-btn {
  display:flex; align-items:center; gap:6px;
  padding:8px 16px; border-radius:10px; border:none;
  background:#fee2e2; color:#dc2626;
  font-size:13px; font-weight:600; cursor:pointer;
  transition:background .15s;
}
.logout-btn:hover { background:#fecaca; }
.btn-manager {
  padding: 8px 16px; border-radius: 10px; border: 1.5px solid #ae68fa;
  background: transparent; color: #ae68fa;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s, color .15s;
}
.btn-manager:hover { background: #ae68fa; color: #fff; }

/* Modal shared */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(17,24,39,.45);
  backdrop-filter: blur(4px); display: flex; align-items: center;
  justify-content: center; z-index: 100; padding: 24px;
}
.modal-card {
  position: relative; width: 100%; background: #fff; border-radius: 28px;
  padding: 36px 40px 32px; box-shadow: 0 32px 80px rgba(149,132,226,.3);
  border: 1px solid rgba(210,196,255,.7); display: flex; flex-direction: column;
  gap: 16px; animation: slideUp .2s ease; overflow-y: auto; max-height: 90vh;
}
.booking-card { max-width: 480px; }
.manager-card { max-width: 480px; }
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
  transition: border-color .15s, box-shadow .15s;
}
.input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.18); }
.name-row { display: flex; gap: 12px; }
.name-row .field { flex: 1; }

.msg { font-size: 13px; padding: 10px 14px; border-radius: 10px; }
.error   { background: #fee2e2; color: #dc2626; }
.success { background: #dcfce7; color: #16a34a; }

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

@media (max-width: 640px) {
  .topbar { padding: 0 16px; }
  .brand-text { display: none; }
  .modal-card { padding: 28px 20px; }
  .name-row { flex-direction: column; }
}
</style>