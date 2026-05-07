<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import starTrail from '@/assets/Design.png'

import Navbar         from '@/components/layout/Navbar.vue'
import Hero           from '@/components/layout/Hero.vue'
import FilterBar      from '@/components/layout/FilterBar.vue'
import SidebarFilters from '@/components/layout/SidebarFilters.vue'
import RoomsGrid      from '@/components/layout/RoomsGrid.vue'
import InquiryModal   from '@/components/layout/InquiryModal.vue'

import { authService, type LoginCredentials, type LoginResponse, type RegisterPayload } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'

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
  const token = localStorage.getItem('token')
  if (!token) { openLoginModal(); return }
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

// ─── Login Modal ──────────────────────────────────────────────────────────────
const showLoginModal  = ref(false)
const loginForm       = reactive<LoginCredentials>({ username_or_email: '', password: '' })
const loginError      = ref('')
const loginSuccess    = ref('')
const loginLoading    = ref(false)
const showLoginPw     = ref(false)

function openLoginModal() {
  showRegisterModal.value = false
  loginError.value = ''; loginSuccess.value = ''
  loginForm.username_or_email = ''; loginForm.password = ''
  showLoginModal.value = true
}

function closeLoginModal() {
  showLoginModal.value  = false
  showForgotModal.value = false
  loginError.value      = ''
  loginSuccess.value    = ''
  forgotStep.value      = 'email'
  forgotEmail.value     = ''
  forgotOtp.value       = ''
  forgotToken.value     = ''
  newPassword.value     = ''
  confirmPassword.value = ''
  forgotMsg.value       = ''
  forgotError.value     = ''
}

const handleLogin = async () => {
  loginError.value = ''; loginSuccess.value = ''; loginLoading.value = true
  try {
    const data: LoginResponse = await authService.login(loginForm)

    auth.login({
      username:      data.username,
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      role:          data.role,
      id:            data.id,
      email:         data.email,
    })

    // 🔍 Add these debug logs
    console.log('1. raw data.role:', data.role)
    console.log('2. auth.user:', JSON.stringify(auth.user))
    console.log('3. auth.user.role:', auth.user?.role)
    console.log('4. isTenant:', auth.isTenant)
    console.log('5. isAdmin:', auth.isAdmin)
    console.log('6. Role.TENANT value:', 'ROLE_TENANT')
    console.log('7. role === ROLE_TENANT?', auth.user?.role === 'ROLE_TENANT')

    const redirect = auth.isAdmin ? '/admin' : auth.isManager ? '/manager' : auth.isTenant ? '/tenant/dashboard' : '/home'
    console.log('8. redirecting to:', redirect)

    loginSuccess.value = `Welcome back, ${data.username}!`
    setTimeout(() => { 
      closeLoginModal()
      console.log('9. calling router.push:', redirect)
      router.push(redirect) 
    }, 1000)
  } catch (err: any) {
    loginError.value = err?.message || 'Invalid credentials.'
  } finally {
    loginLoading.value = false
  }
}

const handleGoogleLogin = () => { window.location.href = 'http://localhost:8080/api/auth/google' }

// ─── Forgot Password (3 steps) ────────────────────────────────────────────────
const showForgotModal = ref(false)
const forgotStep      = ref<'email' | 'otp' | 'reset'>('email')
const forgotEmail     = ref('')
const forgotOtp       = ref('')
const forgotToken     = ref('')
const newPassword     = ref('')
const confirmPassword = ref('')
const forgotMsg       = ref('')
const forgotError     = ref('')
const forgotLoading   = ref(false)

const sendOtp = async () => {
  forgotError.value = ''; forgotMsg.value = ''
  if (!forgotEmail.value) { forgotError.value = 'Please enter your email.'; return }
  forgotLoading.value = true
  try {
    await authService.forgotPassword(forgotEmail.value)
    forgotMsg.value  = 'OTP sent! Check your email.'
    forgotStep.value = 'otp'
  } catch (err: any) {
    forgotError.value = err?.message || 'This email is not registered.'
  } finally {
    forgotLoading.value = false
  }
}

const verifyOtp = async () => {
  forgotError.value = ''; forgotMsg.value = ''
  if (!forgotOtp.value) { forgotError.value = 'Please enter the OTP code.'; return }
  forgotLoading.value = true
  try {
    const res = await authService.verifyOtp(forgotEmail.value, forgotOtp.value)
    forgotToken.value = res.reset_token
    forgotStep.value  = 'reset'
  } catch {
    forgotError.value = 'Invalid or expired OTP.'
  } finally {
    forgotLoading.value = false
  }
}

const resetPassword = async () => {
  forgotError.value = ''; forgotMsg.value = ''
  if (!newPassword.value) { forgotError.value = 'Please enter a new password.'; return }
  if (newPassword.value !== confirmPassword.value) { forgotError.value = 'Passwords do not match.'; return }
  forgotLoading.value = true
  try {
    await authService.resetPassword(forgotToken.value, newPassword.value)
    forgotMsg.value = 'Password reset! You can now log in.'
    setTimeout(() => { showForgotModal.value = false; forgotStep.value = 'email' }, 1500)
  } catch {
    forgotError.value = 'Failed to reset password. Please try again.'
  } finally {
    forgotLoading.value = false
  }
}

// ─── Register Modal ───────────────────────────────────────────────────────────
const showRegisterModal = ref(false)
const registerForm      = reactive<RegisterPayload>({
  username: '', firstName: '', lastName: '',
  email: '', phoneNumber: '', password: '',
})
const registerError    = ref('')
const registerSuccess  = ref('')
const registerLoading  = ref(false)
const showRegisterPw   = ref(false)

function openRegisterModal() {
  showLoginModal.value = false
  registerError.value = ''; registerSuccess.value = ''
  Object.assign(registerForm, { username: '', firstName: '', lastName: '', email: '', phoneNumber: '', password: '' })
  showRegisterModal.value = true
}

function closeRegisterModal() {
  showRegisterModal.value = false
  registerError.value     = ''
  registerSuccess.value   = ''
}

const handleRegister = async () => {
  registerError.value = ''; registerSuccess.value = ''; registerLoading.value = true
  try {
    const data = await authService.register(registerForm)
    registerSuccess.value = data?.message || 'Account created successfully!'
    setTimeout(() => { closeRegisterModal(); openLoginModal() }, 1500)
  } catch (err: any) {
    registerError.value = err?.message || 'Unable to register. Please check your details.'
  } finally {
    registerLoading.value = false
  }
}

const handleGoogleRegister = () => { window.location.href = 'http://localhost:8080/api/auth/google' }
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

    <!-- ── Login Modal ──────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showLoginModal" class="modal-overlay" @click.self="closeLoginModal">
        <div class="modal-card login-card">

          <!-- X button -->
          <button class="modal-close" @click="closeLoginModal">✕</button>

          <!-- Forgot Password sub-panel -->
          <template v-if="showForgotModal">

            <template v-if="forgotStep === 'email'">
              <div class="modal-header">
                <div class="modal-icon">🔑</div>
                <h2>Forgot Password?</h2>
                <p class="modal-sub">Enter your email and we'll send you an OTP code.</p>
              </div>
              <div class="field">
                <label>Email address</label>
                <input v-model="forgotEmail" type="email" placeholder="Enter your email" class="input" @keyup.enter="sendOtp" />
              </div>
              <p v-if="forgotError" class="msg error">{{ forgotError }}</p>
              <p v-if="forgotMsg"   class="msg success">{{ forgotMsg }}</p>
              <button class="btn-primary" :disabled="forgotLoading" @click="sendOtp">
                {{ forgotLoading ? 'Sending…' : 'Send OTP' }}
              </button>
              <button class="btn-cancel" @click="showForgotModal = false">← Back to Login</button>
            </template>

            <template v-else-if="forgotStep === 'otp'">
              <div class="modal-header">
                <div class="modal-icon">📧</div>
                <h2>Enter OTP</h2>
                <p class="modal-sub">We sent a 6-digit code to <strong>{{ forgotEmail }}</strong>.</p>
              </div>
              <div class="field">
                <label>OTP Code</label>
                <input v-model="forgotOtp" type="text" placeholder="Enter 6-digit code" maxlength="6" class="input otp-input" @keyup.enter="verifyOtp" />
              </div>
              <p v-if="forgotError" class="msg error">{{ forgotError }}</p>
              <button class="btn-primary" :disabled="forgotLoading" @click="verifyOtp">
                {{ forgotLoading ? 'Verifying…' : 'Verify OTP' }}
              </button>
              <button class="btn-cancel" @click="forgotStep = 'email'">← Back</button>
            </template>

            <template v-else-if="forgotStep === 'reset'">
              <div class="modal-header">
                <div class="modal-icon">🔒</div>
                <h2>New Password</h2>
                <p class="modal-sub">Choose a strong new password.</p>
              </div>
              <div class="field">
                <label>New Password</label>
                <input v-model="newPassword" type="password" placeholder="Enter new password" class="input" />
              </div>
              <div class="field">
                <label>Confirm Password</label>
                <input v-model="confirmPassword" type="password" placeholder="Confirm new password" class="input" @keyup.enter="resetPassword" />
              </div>
              <p v-if="forgotError" class="msg error">{{ forgotError }}</p>
              <p v-if="forgotMsg"   class="msg success">{{ forgotMsg }}</p>
              <button class="btn-primary" :disabled="forgotLoading" @click="resetPassword">
                {{ forgotLoading ? 'Resetting…' : 'Reset Password' }}
              </button>
              <button class="btn-cancel" @click="showForgotModal = false">Cancel</button>
            </template>

          </template>

          <!-- Login form -->
          <template v-else>
            <div class="modal-header">
              <h2>Login now</h2>
              <p class="modal-sub">Welcome back — enter your credentials to continue.</p>
            </div>

            <button class="btn-google" type="button" @click="handleGoogleLogin">
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div class="divider"><span>or</span></div>

            <div class="field">
              <label>Username or Email</label>
              <input v-model="loginForm.username_or_email" type="text" placeholder="Enter your username or email" autocomplete="username" class="input" />
            </div>

            <div class="field">
              <label>Password</label>
              <div class="input-wrap">
                <input v-model="loginForm.password" :type="showLoginPw ? 'text' : 'password'" placeholder="Enter your password" autocomplete="current-password" class="input input-with-icon" @keyup.enter="handleLogin" />
                <button class="eye-btn" type="button" @click="showLoginPw = !showLoginPw">
                  <svg v-if="!showLoginPw" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="row-between">
              <button class="text-link" type="button" @click="showForgotModal = true">Forgot Password?</button>
            </div>

            <p v-if="loginError"   class="msg error">{{ loginError }}</p>
            <p v-if="loginSuccess" class="msg success">{{ loginSuccess }}</p>

            <button class="btn-primary" :disabled="loginLoading" @click="handleLogin">
              {{ loginLoading ? 'Logging in…' : 'Login' }}
            </button>

            <p class="switch-text">
              Don't have an account?
              <button class="link-btn" @click="openRegisterModal">Signup</button>
            </p>
          </template>

        </div>
      </div>
    </Teleport>

    <!-- ── Register Modal ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showRegisterModal" class="modal-overlay" @click.self="closeRegisterModal">
        <div class="modal-card register-card">

          <!-- X button -->
          <button class="modal-close" @click="closeRegisterModal">✕</button>

          <div class="modal-header">
            <h2>Signup now</h2>
            <p class="modal-sub">Create your account to get started.</p>
          </div>

          <button class="btn-google" type="button" @click="handleGoogleRegister">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign up with Google
          </button>

          <div class="divider"><span>or</span></div>

          <div class="field">
            <label>Username</label>
            <input v-model="registerForm.username" type="text" placeholder="Choose a username" autocomplete="username" class="input" />
          </div>

          <div class="name-row">
            <div class="field">
              <label>First name</label>
              <input v-model="registerForm.firstName" type="text" placeholder="First name" class="input" />
            </div>
            <div class="field">
              <label>Last name</label>
              <input v-model="registerForm.lastName" type="text" placeholder="Last name" class="input" />
            </div>
          </div>

          <div class="field">
            <label>Email address</label>
            <input v-model="registerForm.email" type="email" placeholder="Enter your email" autocomplete="email" class="input" />
          </div>

          <div class="field">
            <label>Phone number</label>
            <input v-model="registerForm.phoneNumber" type="tel" placeholder="Enter your phone number" class="input" />
          </div>

          <div class="field">
            <label>Password</label>
            <div class="input-wrap">
              <input v-model="registerForm.password" :type="showRegisterPw ? 'text' : 'password'" placeholder="Create a password" autocomplete="new-password" class="input input-with-icon" @keyup.enter="handleRegister" />
              <button class="eye-btn" type="button" @click="showRegisterPw = !showRegisterPw">
                <svg v-if="!showRegisterPw" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <p v-if="registerError"   class="msg error">{{ registerError }}</p>
          <p v-if="registerSuccess" class="msg success">{{ registerSuccess }} Redirecting to login…</p>

          <button class="btn-primary" :disabled="registerLoading" @click="handleRegister">
            {{ registerLoading ? 'Signing up…' : 'Signup' }}
          </button>

          <p class="switch-text">
            Already have an account?
            <button class="link-btn" @click="openLoginModal">Login</button>
          </p>

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

/* ── Modal shared ─────────────────────────────────────────────────────────── */
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

.login-card    { max-width: 440px; }
.register-card { max-width: 480px; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── X close button ──────────────────────────────────────────────────────── */
.modal-close {
  position: absolute; top: 16px; right: 18px;
  background: none; border: none; font-size: 18px; line-height: 1;
  color: #9ca3af; cursor: pointer; padding: 4px 6px; border-radius: 8px;
  transition: color .15s, background .15s;
}
.modal-close:hover { color: #111827; background: #f3f4f6; }

/* ── Modal header ────────────────────────────────────────────────────────── */
.modal-header { display: flex; flex-direction: column; gap: 4px; }
.modal-icon   { font-size: 36px; text-align: center; margin-bottom: 4px; }
.modal-header h2 { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
.modal-sub { font-size: 14px; color: #6b7280; margin: 0; }

/* ── Form elements ───────────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; color: #4b5563; font-weight: 500; }

.input {
  width: 100%; border-radius: 24px; border: 1px solid #e0ddf7;
  padding: 11px 16px; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
}
.input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.18); }
.otp-input { text-align: center; letter-spacing: 8px; font-size: 20px; font-weight: 700; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-with-icon { width: 100%; padding-right: 44px !important; }
.eye-btn {
  position: absolute; right: 14px; background: none; border: none;
  cursor: pointer; color: #9ca3af; display: flex; align-items: center; padding: 0;
  transition: color .15s;
}
.eye-btn:hover { color: #ae68fa; }

.name-row { display: flex; gap: 12px; }
.name-row .field { flex: 1; }

.divider { display: flex; align-items: center; gap: 12px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #4B5563; }
.divider span { color: #9ca3af; font-size: 13px; }

.row-between { display: flex; justify-content: flex-end; margin-top: -6px; }

/* ── Messages ────────────────────────────────────────────────────────────── */
.msg { font-size: 13px; padding: 10px 14px; border-radius: 10px; }
.error   { background: #fee2e2; color: #dc2626; }
.success { background: #dcfce7; color: #16a34a; }

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.btn-google {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 11px 16px; border-radius: 999px; border: 1.5px solid #e0ddf7; background: #fff;
  color: #374151; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.btn-google:hover { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.12); }

.btn-primary {
  width: 100%; padding: 12px; border-radius: 999px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.btn-primary:hover    { opacity: .9; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }

.btn-cancel {
  width: 100%; padding: 11px; border-radius: 999px; border: 1.5px solid #e0ddf7;
  background: transparent; color: #6b7280; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: border-color .15s, color .15s;
}
.btn-cancel:hover { border-color: #ae68fa; color: #ae68fa; }

.text-link {
  border: none; background: transparent; font-size: 13px; color: #6366f1;
  cursor: pointer; padding: 0; transition: color .15s;
}
.text-link:hover { color: #ae68fa; text-decoration: underline; }

.switch-text { font-size: 14px; color: #6b7280; text-align: center; }
.link-btn {
  border: none; background: transparent; font-size: 14px; color: #ae68fa;
  font-weight: 600; cursor: pointer; padding: 0; text-decoration: none;
  transition: text-decoration .15s;
}
.link-btn:hover { text-decoration: underline; }

@media (max-width: 900px) {
  .modal-card { padding: 28px 20px; }
  .name-row   { flex-direction: column; }
}
</style>