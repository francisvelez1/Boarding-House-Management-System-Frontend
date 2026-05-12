<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authService, type LoginResponse, type RegisterPayload } from '../../services/authService'
import { managerRequestService } from '../../services/managerRequestService'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{
  showRole: boolean
  showApp: boolean
  registerForm: RegisterPayload
}>()

const emit = defineEmits<{
  (e: 'update:showRole', v: boolean): void
  (e: 'update:showApp', v: boolean): void
  (e: 'register-error', msg: string): void
}>()

const router = useRouter()
const auth   = useAuthStore()

const managerAppForm = reactive({
  property_name: '',
  location: '',
  address: '',
  room_count: 1,
  description: '',
})
const managerAppError   = ref('')
const managerAppSuccess = ref('')
const managerAppLoading = ref(false)

async function chooseTenant() {
  emit('update:showRole', false)
  try {
    await authService.register(props.registerForm)
    const loginData: LoginResponse = await authService.login({
      username_or_email: props.registerForm.username,
      password: props.registerForm.password,
    })
    auth.login({
      username:      loginData.username,
      access_token:  loginData.access_token,
      refresh_token: loginData.refresh_token,
      role:          loginData.role,
      id:            loginData.id,
      email:         loginData.email,
    })
    router.push('/tenant/dashboard')
  } catch (err: any) {
    emit('register-error', err?.message || 'Registration failed. Please try again.')
  }
}

function chooseManager() {
  emit('update:showRole', false)
  managerAppError.value   = ''
  managerAppSuccess.value = ''
  managerAppForm.property_name = ''
  managerAppForm.location      = ''
  managerAppForm.address       = ''
  managerAppForm.room_count    = 1
  managerAppForm.description   = ''
  emit('update:showApp', true)
}

async function submitManagerApp() {
  managerAppError.value = ''; managerAppLoading.value = true
  try {
    const roomCount = Number(managerAppForm.room_count)
    if (!Number.isFinite(roomCount) || roomCount < 1 || !Number.isInteger(roomCount)) {
      managerAppError.value = 'Please enter a valid number of rooms (minimum 1).'
      managerAppLoading.value = false
      return
    }
    await authService.register(props.registerForm)
    const loginData: LoginResponse = await authService.login({
      username_or_email: props.registerForm.username,
      password: props.registerForm.password,
    })
    auth.login({
      username:      loginData.username,
      access_token:  loginData.access_token,
      refresh_token: loginData.refresh_token,
      role:          loginData.role,
      id:            loginData.id,
      email:         loginData.email,
    })
    const res = await managerRequestService.apply({
      property_name: managerAppForm.property_name,
      location:      managerAppForm.location,
      address:       managerAppForm.address,
      room_count:    roomCount,
      description:   managerAppForm.description || undefined,
    })
    managerAppSuccess.value = res.message || 'Application submitted! Admin will review it.'
    setTimeout(() => {
      emit('update:showApp', false)
      router.push('/tenant/dashboard')
    }, 1800)
  } catch (err: any) {
    managerAppError.value = err?.response?.data?.detail ?? err?.message ?? 'Failed to submit application.'
  } finally {
    managerAppLoading.value = false
  }
}
</script>

<template>
  <!-- ── Role Selection Modal ──────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="showRole" class="modal-overlay">
      <div class="modal-card role-card">
        <div class="modal-header" style="text-align:center;align-items:center">
          <div class="modal-icon">🏠</div>
          <h2>Welcome to ResidEase!</h2>
          <p class="modal-sub">Your account is ready. How will you use ResidEase?</p>
        </div>
        <div class="role-btns">
          <button class="role-btn role-btn--tenant" @click="chooseTenant">
            <span class="role-btn-icon">🙋</span>
            <span class="role-btn-title">I'm a Tenant</span>
            <span class="role-btn-sub">Browse and book a room</span>
          </button>
          <button class="role-btn role-btn--manager" @click="chooseManager">
            <span class="role-btn-icon">🏢</span>
            <span class="role-btn-title">Apply as Manager</span>
            <span class="role-btn-sub">Manage boarding house properties</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Manager Application Modal ────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="showApp" class="modal-overlay" @click.self="emit('update:showApp', false)">
      <div class="modal-card register-card">
        <button class="modal-close" @click="emit('update:showApp', false)">✕</button>

        <template v-if="!managerAppSuccess">
          <div class="modal-header">
            <div class="modal-icon">🏢</div>
            <h2>Manager Application</h2>
            <p class="modal-sub">Tell us about your property. Admin will review and approve your application.</p>
          </div>
          <div class="field">
            <label>Property Name</label>
            <input v-model="managerAppForm.property_name" type="text" placeholder="e.g. Sunshine Boarding House" class="input" />
          </div>
          <div class="field">
            <label>Location / City</label>
            <input v-model="managerAppForm.location" type="text" placeholder="e.g. Cebu City" class="input" />
          </div>
          <div class="field">
            <label>Full Address</label>
            <input v-model="managerAppForm.address" type="text" placeholder="Street, Barangay, City" class="input" />
          </div>
          <div class="field">
            <label>Number of Rooms</label>
            <input v-model.number="managerAppForm.room_count" type="number" min="1" step="1" class="input" />
          </div>
          <div class="field">
            <label>Description <span style="color:#9ca3af;font-weight:400">(optional)</span></label>
            <textarea v-model="managerAppForm.description" class="input" rows="3" placeholder="Tell us more about your property…" style="resize:vertical"></textarea>
          </div>
          <p v-if="managerAppError" class="msg error">{{ managerAppError }}</p>
          <button class="btn-primary" :disabled="managerAppLoading" @click="submitManagerApp">
            {{ managerAppLoading ? 'Submitting…' : 'Submit Application' }}
          </button>
        </template>

        <template v-else>
          <div style="text-align:center;padding:24px 0">
            <div class="modal-icon">✅</div>
            <h2 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 8px">Application Sent!</h2>
            <p style="color:#6b7280;font-size:14px">{{ managerAppSuccess }}<br>You'll be redirected to your dashboard.</p>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.modal-card { position: relative; width: 100%; background: #fff; border-radius: 28px; padding: 36px 40px 32px; box-shadow: 0 32px 80px rgba(149,132,226,.3); border: 1px solid rgba(210,196,255,.7); display: flex; flex-direction: column; gap: 16px; animation: slideUp .2s ease; overflow-y: auto; max-height: 90vh; }
.role-card { max-width: 440px; }
.register-card { max-width: 480px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.modal-close { position: absolute; top: 16px; right: 18px; background: none; border: none; font-size: 18px; line-height: 1; color: #9ca3af; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: color .15s, background .15s; }
.modal-close:hover { color: #111827; background: #f3f4f6; }
.modal-header { display: flex; flex-direction: column; gap: 4px; }
.modal-icon { font-size: 36px; text-align: center; margin-bottom: 4px; }
.modal-header h2 { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
.modal-sub { font-size: 14px; color: #6b7280; margin: 0; }
.role-btns { display: flex; flex-direction: column; gap: 12px; }
.role-btn { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 18px; border: 2px solid #e0ddf7; background: #faf7ff; cursor: pointer; text-align: left; transition: border-color .15s, box-shadow .15s; }
.role-btn:hover { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.12); }
.role-btn--manager:hover { border-color: #f1966e; box-shadow: 0 0 0 3px rgba(241,150,110,.12); }
.role-btn-icon { font-size: 28px; flex-shrink: 0; }
.role-btn-title { font-size: 15px; font-weight: 700; color: #111827; display: block; }
.role-btn-sub { font-size: 12px; color: #6b7280; display: block; margin-top: 2px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; color: #4b5563; font-weight: 500; }
.input { width: 100%; border-radius: 24px; border: 1px solid #e0ddf7; padding: 11px 16px; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.18); }
.msg { font-size: 13px; padding: 10px 14px; border-radius: 10px; }
.error { background: #fee2e2; color: #dc2626; }
.btn-primary { width: 100%; padding: 12px; border-radius: 999px; border: none; background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .9; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
@media (max-width: 900px) { .modal-card { padding: 28px 20px; } }
</style>
