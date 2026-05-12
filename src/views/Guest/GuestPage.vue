<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import starTrail from '@/assets/Design.png'

import Navbar         from '@/components/layout/Navbar.vue'
import Hero           from '@/components/layout/Hero.vue'
import FilterBar      from '@/components/layout/FilterBar.vue'
import SidebarFilters from '@/components/layout/SidebarFilters.vue'
import RoomsGrid      from '@/components/layout/RoomsGrid.vue'
import InquiryModal   from '@/components/layout/InquiryModal.vue'
import LoginPopUp     from './LoginPopUp.vue'
import RegisterPopUp  from './RegisterPopUp.vue'
import ManagerRoleRequest from './ManagerRoleRequest.vue'

import { useAuthStore } from '../../stores/auth'
import type { RegisterPayload } from '../../services/authService'

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
    rooms.value = [
      {
        id: '1', room_number: '2A', room_type: RoomType.SINGLE,
        floor_level: FloorLevel.SECOND, status: RoomStatus.VACANT,
        monthly_rate: 4500, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 1, current_occupants: 0,
        amenities: [
          { name: 'WiFi', is_working: true },
          { name: 'AC', is_working: true },
          { name: 'CR own', is_working: true },
        ],
        images: [], created_at: '', updated_at: '',
      },
      {
        id: '2', room_number: '3B', room_type: RoomType.DOUBLE,
        floor_level: FloorLevel.THIRD, status: RoomStatus.VACANT,
        monthly_rate: 4200, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 2, current_occupants: 1,
        amenities: [
          { name: 'WiFi', is_working: true },
          { name: 'Fan', is_working: true },
          { name: 'CR shared', is_working: false },
        ],
        images: [], created_at: '', updated_at: '',
      },
      {
        id: '3', room_number: '1C', room_type: RoomType.STUDIO,
        floor_level: FloorLevel.GROUND, status: RoomStatus.RESERVED,
        monthly_rate: 6000, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 1, current_occupants: 0,
        amenities: [
          { name: 'WiFi', is_working: true },
          { name: 'AC', is_working: true },
          { name: 'Ref', is_working: true },
        ],
        images: [], created_at: '', updated_at: '',
      },
      {
        id: '4', room_number: '4D', room_type: RoomType.DORMITORY,
        floor_level: FloorLevel.FOURTH, status: RoomStatus.VACANT,
        monthly_rate: 2800, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 6, current_occupants: 3,
        amenities: [
          { name: 'WiFi', is_working: true },
          { name: 'Laundry', is_working: true },
          { name: 'CCTV', is_working: true },
        ],
        images: [], created_at: '', updated_at: '',
      },
      {
        id: '5', room_number: 'GF-01', room_type: RoomType.SUITE,
        floor_level: FloorLevel.GROUND, status: RoomStatus.VACANT,
        monthly_rate: 9500, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 2, current_occupants: 0,
        amenities: [
          { name: 'WiFi', is_working: true },
          { name: 'AC', is_working: true },
          { name: 'CR own', is_working: true },
          { name: 'Ref', is_working: true },
          { name: 'Parking', is_working: true },
        ],
        images: [], created_at: '', updated_at: '',
      },
      {
        id: '6', room_number: '2F', room_type: RoomType.DOUBLE,
        floor_level: FloorLevel.SECOND, status: RoomStatus.MAINTENANCE,
        monthly_rate: 5500, deposit_multiplier: 2, advance_multiplier: 1,
        max_occupants: 2, current_occupants: 0,
        amenities: [
          { name: 'AC', is_working: false },
          { name: 'CR own', is_working: true },
          { name: 'Parking', is_working: true },
        ],
        images: [], created_at: '', updated_at: '',
      },
    ]
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

// ─── Inquiry modal ────────────────────────────────────────────────────────────
const showInquiry = ref(false)
const inquiryRoom = ref<Room | null>(null)

function openInquiry(room: Room) {
  const token = localStorage.getItem('access_token')
  if (!token) { 
    pendingRoom.value = room
    openLoginModal() 
    return 
  }
  inquiryRoom.value = room
  showInquiry.value = true
}

function closeInquiry() {
  showInquiry.value = false
  inquiryRoom.value = null
}

// ─── Reset ────────────────────────────────────────────────────────────────────
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

// ─── Modal orchestration ─────────────────────────────────────────────────────
const showLoginModal     = ref(false)
const showRegisterModal  = ref(false)
const showRoleModal      = ref(false)
const showManagerAppModal = ref(false)
const pendingRoom        = ref<Room | null>(null)
const pendingRegisterForm = ref<RegisterPayload>({ username: '', firstName: '', lastName: '', email: '', phoneNumber: '', password: '' })

function openLoginModal() {
  showRegisterModal.value = false
  showLoginModal.value = true
}

function openRegisterModal() {
  showLoginModal.value = false
  showRegisterModal.value = true
}

function onLoginSuccess(payload: { redirect: string; pendingRoom?: Room | null }) {
  if (payload.pendingRoom && auth.isTenant) {
    inquiryRoom.value = payload.pendingRoom
    pendingRoom.value = null
    showInquiry.value = true
    return
  }
  router.push(payload.redirect)
}

function onRegisterValidated(form: RegisterPayload) {
  pendingRegisterForm.value = form
  showRoleModal.value = true
}

function onRegisterError(msg: string) {
  showRegisterModal.value = true
}
</script>

<template>
  <div class="page">
    <img :src="starTrail" class="bg-design" alt="">

    <Navbar
      :available-count="availableCount"
      @scroll-to-rooms="scrollToRooms"
      @open-login="openLoginModal"
      @open-register="openRegisterModal"
    />

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
        @inquire="openInquiry"
        @clear-filters="resetFilters"
      />
    </div>

    <InquiryModal
      v-if="showInquiry"
      :room="inquiryRoom"
      @close="closeInquiry"
    />

    <LoginPopUp
      v-model="showLoginModal"
      :pending-room="pendingRoom"
      @open-register="openRegisterModal"
      @login-success="onLoginSuccess"
    />

    <RegisterPopUp
      v-model="showRegisterModal"
      @open-login="openLoginModal"
      @register-validated="onRegisterValidated"
    />

    <ManagerRoleRequest
      :show-role="showRoleModal"
      :show-app="showManagerAppModal"
      :register-form="pendingRegisterForm"
      @update:show-role="showRoleModal = $event"
      @update:show-app="showManagerAppModal = $event"
      @register-error="onRegisterError"
    />
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
</style>