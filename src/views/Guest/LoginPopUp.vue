<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authService, type LoginCredentials, type LoginResponse } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import type { Room } from '../../models/room'

const props = defineProps<{
  modelValue: boolean
  pendingRoom?: Room | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'open-register'): void
  (e: 'login-success', payload: { redirect: string; pendingRoom?: Room | null }): void
}>()

const router = useRouter()
const auth   = useAuthStore()

const loginForm    = reactive<LoginCredentials>({ username_or_email: '', password: '' })
const loginError   = ref('')
const loginSuccess = ref('')
const loginLoading = ref(false)
const showLoginPw  = ref(false)

// ─── Forgot Password (3 steps) ──────────────────────────────────
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

function resetState() {
  loginError.value      = ''
  loginSuccess.value    = ''
  showForgotModal.value = false
  forgotStep.value      = 'email'
  forgotEmail.value     = ''
  forgotOtp.value       = ''
  forgotToken.value     = ''
  newPassword.value     = ''
  confirmPassword.value = ''
  forgotMsg.value       = ''
  forgotError.value     = ''
  loginForm.username_or_email = ''
  loginForm.password = ''
}

function close() {
  resetState()
  emit('update:modelValue', false)
}

function openRegister() {
  close()
  emit('open-register')
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
    loginSuccess.value = `Welcome back, ${data.username}!`

    setTimeout(() => {
      const redirect = auth.isAdmin ? '/admin' : auth.isManager ? '/manager' : '/tenant/dashboard'
      close()
      emit('login-success', { redirect, pendingRoom: props.pendingRoom })
    }, 1000)
  } catch (err: any) {
    loginError.value = err?.message || 'Invalid credentials.'
  } finally {
    loginLoading.value = false
  }
}

const handleGoogleLogin = () => { window.location.href = 'http://localhost:8080/api/auth/google' }

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
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal-card login-card">
        <button class="modal-close" @click="close">✕</button>

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
            <button class="link-btn" @click="openRegister">Signup</button>
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 24px; }
.modal-card { position: relative; width: 100%; background: #fff; border-radius: 28px; padding: 36px 40px 32px; box-shadow: 0 32px 80px rgba(149,132,226,.3); border: 1px solid rgba(210,196,255,.7); display: flex; flex-direction: column; gap: 16px; animation: slideUp .2s ease; overflow-y: auto; max-height: 90vh; }
.login-card { max-width: 440px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.modal-close { position: absolute; top: 16px; right: 18px; background: none; border: none; font-size: 18px; line-height: 1; color: #9ca3af; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: color .15s, background .15s; }
.modal-close:hover { color: #111827; background: #f3f4f6; }
.modal-header { display: flex; flex-direction: column; gap: 4px; }
.modal-icon { font-size: 36px; text-align: center; margin-bottom: 4px; }
.modal-header h2 { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
.modal-sub { font-size: 14px; color: #6b7280; margin: 0; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; color: #4b5563; font-weight: 500; }
.input { width: 100%; border-radius: 24px; border: 1px solid #e0ddf7; padding: 11px 16px; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.18); }
.otp-input { text-align: center; letter-spacing: 8px; font-size: 20px; font-weight: 700; }
.input-wrap { position: relative; display: flex; align-items: center; }
.input-with-icon { width: 100%; padding-right: 44px !important; }
.eye-btn { position: absolute; right: 14px; background: none; border: none; cursor: pointer; color: #9ca3af; display: flex; align-items: center; padding: 0; transition: color .15s; }
.eye-btn:hover { color: #ae68fa; }
.divider { display: flex; align-items: center; gap: 12px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #4B5563; }
.divider span { color: #9ca3af; font-size: 13px; }
.row-between { display: flex; justify-content: flex-end; margin-top: -6px; }
.msg { font-size: 13px; padding: 10px 14px; border-radius: 10px; }
.error { background: #fee2e2; color: #dc2626; }
.success { background: #dcfce7; color: #16a34a; }
.btn-google { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 11px 16px; border-radius: 999px; border: 1.5px solid #e0ddf7; background: #fff; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.btn-google:hover { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.12); }
.btn-primary { width: 100%; padding: 12px; border-radius: 999px; border: none; background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .9; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-cancel { width: 100%; padding: 11px; border-radius: 999px; border: 1.5px solid #e0ddf7; background: transparent; color: #6b7280; font-size: 14px; font-weight: 600; cursor: pointer; transition: border-color .15s, color .15s; }
.btn-cancel:hover { border-color: #ae68fa; color: #ae68fa; }
.text-link { border: none; background: transparent; font-size: 13px; color: #6366f1; cursor: pointer; padding: 0; transition: color .15s; }
.text-link:hover { color: #ae68fa; text-decoration: underline; }
.switch-text { font-size: 14px; color: #6b7280; text-align: center; }
.link-btn { border: none; background: transparent; font-size: 14px; color: #ae68fa; font-weight: 600; cursor: pointer; padding: 0; text-decoration: none; transition: text-decoration .15s; }
.link-btn:hover { text-decoration: underline; }
@media (max-width: 900px) { .modal-card { padding: 28px 20px; } }
</style>
