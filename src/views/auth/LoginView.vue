<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService, type LoginCredentials, type LoginResponse } from '../../services/authService'
import { useAuthStore } from '../../stores/auth'
import logo      from '../../assets/Logo.png'
import starTrail from '../../assets/Design.png'

const router = useRouter()
const auth   = useAuthStore()

const form    = reactive<LoginCredentials>({ username_or_email: '', password: '' })
const error   = ref('')
const success = ref('')
const loading = ref(false)
const showPassword = ref(false)

// ── Forgot Password (3 steps: email → OTP → reset) ──────────
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

// ── Login ────────────────────────────────────────────────────
const handleLogin = async () => {
  error.value = ''; success.value = ''; loading.value = true
  try {
    const data: LoginResponse = await authService.login(form)
    auth.login({ username: data.username, access_token: data.access_token, refresh_token: data.refresh_token })
    success.value = `Welcome back, ${data.username}!`
    router.push('/home')
  } catch (err: any) {
    error.value = err?.message || 'Invalid credentials.'
  } finally {
    loading.value = false
  }
}

// ── Google Login ─────────────────────────────────────────────
const handleGoogleLogin = () => {
  window.location.href = 'http://localhost:8080/api/auth/google'
}

// ── Forgot Password Steps ────────────────────────────────────
const sendOtp = async () => {
  forgotError.value = ''; forgotMsg.value = ''
  if (!forgotEmail.value) { forgotError.value = 'Please enter your email.'; return }
  forgotLoading.value = true
  try {
    await authService.forgotPassword(forgotEmail.value)
    forgotMsg.value = 'OTP sent! Check your email.'
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
    setTimeout(closeForgotModal, 1500)
  } catch {
    forgotError.value = 'Failed to reset password. Please try again.'
  } finally {
    forgotLoading.value = false
  }
}

const closeForgotModal = () => {
  showForgotModal.value = false
  forgotStep.value      = 'email'
  forgotEmail.value     = ''
  forgotOtp.value       = ''
  forgotToken.value     = ''
  newPassword.value     = ''
  confirmPassword.value = ''
  forgotMsg.value       = ''
  forgotError.value     = ''
}
</script>

<template>
  <div class="page">
    <header class="brand">
      <img :src="logo" alt="ResidEase" class="brand-logo" />
      <span class="brand-text">Boarding House Management System</span>
    </header>

    <main class="layout">
      <img :src="starTrail" alt="" class="decor" />

      <div class="form-card">
        <h1>Login now</h1>
        <p class="form-sub">Welcome back — enter your credentials to continue.</p>

        <!-- Google Login -->
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

        <!-- Username or Email -->
        <div class="field">
          <label>Username or Email</label>
          <input v-model="form.username_or_email" type="text" placeholder="Enter your username or email" autocomplete="username" class="input" />
        </div>

        <!-- Password -->
        <div class="field">
          <label>Password</label>
          <div class="input-wrap">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Enter your password" autocomplete="current-password" class="input input-with-icon" @keyup.enter="handleLogin" />
            <button class="eye-btn" type="button" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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

        <p v-if="error"   class="msg error">{{ error }}</p>
        <p v-if="success" class="msg success">{{ success }}</p>

        <button class="btn-primary" :disabled="loading" @click="handleLogin">
          {{ loading ? 'Logging in…' : 'Login' }}
        </button>

        <p class="switch-text">
          Don't have an account? <RouterLink to="/register" class="link">Signup</RouterLink>
        </p>
      </div>
    </main>

    <!-- Forgot Password Modal (3 steps) -->
    <Teleport to="body">
      <div v-if="showForgotModal" class="modal-overlay" @click.self="closeForgotModal">
        <div class="modal-card">

          <!-- Step 1: Email -->
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
            <button class="btn-cancel" @click="closeForgotModal">Cancel</button>
          </template>

          <!-- Step 2: OTP -->
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

          <!-- Step 3: New Password -->
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
            <button class="btn-cancel" @click="closeForgotModal">Cancel</button>
          </template>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page { min-height:100vh; padding:40px 80px; background:#faf7ff; box-sizing:border-box; }
.brand { display:flex; align-items:center; gap:10px; margin-bottom:48px; }
.brand-logo { width:40px; height:40px; }
.brand-text { font-weight:600; font-size:18px; color:#1f2933; }

.layout { position:relative; display:flex; align-items:center; justify-content:center; max-width:1100px; margin:0 auto; }
.decor  { position:absolute; left:0; top:50%; width:220px; pointer-events:none; transform:translate(-20%,-50%); }

.form-card {
  width:100%; max-width:480px; background:#fff; border-radius:30px;
  padding:40px 48px 36px; box-shadow:0 26px 60px rgba(149,132,226,.25);
  border:1px solid rgba(210,196,255,.7); display:flex; flex-direction:column; gap:18px;
}
h1 { font-size:28px; font-weight:700; color:#111827; margin:0; }
.form-sub { font-size:14px; color:#6b7280; margin-top:-8px; }

.btn-google {
  width:100%; display:flex; align-items:center; justify-content:center; gap:10px;
  padding:11px 16px; border-radius:999px; border:1.5px solid #e0ddf7; background:#fff;
  color:#374151; font-size:14px; font-weight:600; cursor:pointer;
  transition:border-color .15s, box-shadow .15s;
}
.btn-google:hover { border-color:#ae68fa; box-shadow:0 0 0 3px rgba(174,104,250,.12); }

.divider { display:flex; align-items:center; gap:12px; }
.divider::before, .divider::after { content:''; flex:1; height:1px; background:#e5e7eb; }
.divider span { color:#9ca3af; font-size:13px; }

.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-size:14px; color:#4b5563; font-weight:500; }

.input-wrap { position:relative; display:flex; align-items:center; }
.input-with-icon { width:100%; padding-right:44px !important; }
.eye-btn { position:absolute; right:14px; background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; align-items:center; padding:0; transition:color .15s; }
.eye-btn:hover { color:#ae68fa; }

.input {
  width:100%; border-radius:24px; border:1px solid #e0ddf7;
  padding:11px 16px; font-size:14px; outline:none; box-sizing:border-box;
  transition:border-color .15s, box-shadow .15s;
}
.input:focus { border-color:#ae68fa; box-shadow:0 0 0 3px rgba(174,104,250,.18); }
.otp-input { text-align:center; letter-spacing:8px; font-size:20px; font-weight:700; }

.row-between { display:flex; justify-content:flex-end; margin-top:-8px; }

.msg { font-size:13px; padding:10px 14px; border-radius:10px; }
.error   { background:#fee2e2; color:#dc2626; }
.success { background:#dcfce7; color:#16a34a; }

.btn-primary { width:100%; padding:12px; border-radius:999px; border:none; background:linear-gradient(90deg,#ae68fa,#f1966e); color:#fff; font-size:15px; font-weight:600; cursor:pointer; transition:opacity .15s; }
.btn-primary:hover    { opacity:.9; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }

.switch-text { font-size:14px; color:#6b7280; text-align:center; }
.link { color:#ae68fa; font-weight:600; text-decoration:none; }
.link:hover { text-decoration:underline; }

.text-link { border:none; background:transparent; font-size:13px; color:#6366f1; cursor:pointer; padding:0; transition:color .15s; }
.text-link:hover { color:#ae68fa; text-decoration:underline; }

.modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:100; padding:24px; }
.modal-card { width:100%; max-width:420px; background:#fff; border-radius:28px; padding:36px 40px 32px; box-shadow:0 32px 80px rgba(149,132,226,.3); border:1px solid rgba(210,196,255,.7); display:flex; flex-direction:column; gap:16px; animation:slideUp .2s ease; }
@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

.modal-header { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.modal-icon   { font-size:36px; margin-bottom:4px; }
.modal-header h2 { font-size:22px; font-weight:700; color:#111827; margin:0; }
.modal-sub { font-size:14px; color:#6b7280; margin:0; }

.btn-cancel { width:100%; padding:11px; border-radius:999px; border:1.5px solid #e0ddf7; background:transparent; color:#6b7280; font-size:14px; font-weight:600; cursor:pointer; transition:border-color .15s, color .15s; }
.btn-cancel:hover { border-color:#ae68fa; color:#ae68fa; }

@media (max-width:900px) {
  .page { padding:24px 16px; }
  .decor { display:none; }
  .form-card { padding:32px 24px; }
  .modal-card { padding:28px 24px; }
}
</style>