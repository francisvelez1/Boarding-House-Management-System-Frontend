<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService, type RegisterPayload } from '../../services/authService'
import logo      from '../../assets/Logo.png'
import starTrail from '../../assets/Design.png'

const router = useRouter()

const form = reactive<RegisterPayload>({
  username:    '',
  firstName:   '',
  lastName:    '',
  email:       '',
  phoneNumber: '',
  password:    '',
})
const error        = ref('')
const success      = ref('')
const loading      = ref(false)
const showPassword = ref(false)

const handleRegister = async () => {
  error.value = ''; success.value = ''; loading.value = true
  try {
    const data = await authService.register(form)
    success.value = data?.message || 'Account created successfully!'
    setTimeout(() => router.push('/login'), 1500)
  } catch (err: any) {
    error.value = err?.message || 'Unable to register. Please check your details.'
  } finally {
    loading.value = false
  }
}

const handleGoogleRegister = () => {
  // Same Google OAuth flow — backend auto-registers if user doesn't exist
  window.location.href = 'http://localhost:8080/api/auth/google'
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
        <h1>Signup now</h1>
        <p class="form-sub">Create your account to get started.</p>

        <!-- Google Register -->
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

        <!-- Username -->
        <div class="field">
          <label>Username</label>
          <input v-model="form.username" type="text" placeholder="Choose a username" autocomplete="username" class="input" />
        </div>

        <!-- First & Last name -->
        <div class="name-row">
          <div class="field">
            <label>First name</label>
            <input v-model="form.firstName" type="text" placeholder="First name" class="input" />
          </div>
          <div class="field">
            <label>Last name</label>
            <input v-model="form.lastName" type="text" placeholder="Last name" class="input" />
          </div>
        </div>

        <!-- Email -->
        <div class="field">
          <label>Email address</label>
          <input v-model="form.email" type="email" placeholder="Enter your email" autocomplete="email" class="input" />
        </div>

        <!-- Phone -->
        <div class="field">
          <label>Phone number</label>
          <input v-model="form.phoneNumber" type="tel" placeholder="Enter your phone number" class="input" />
        </div>

        <!-- Password -->
        <div class="field">
          <label>Password</label>
          <div class="input-wrap">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Create a password" autocomplete="new-password" class="input input-with-icon" @keyup.enter="handleRegister" />
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

        <p v-if="error"   class="msg error">{{ error }}</p>
        <p v-if="success" class="msg success">{{ success }} Redirecting to login…</p>

        <button class="btn-primary" :disabled="loading" @click="handleRegister">
          {{ loading ? 'Signing up…' : 'Signup' }}
        </button>

        <p class="switch-text">
          Already have an account? <RouterLink to="/login" class="link">Login</RouterLink>
        </p>
      </div>
    </main>
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

.name-row { display:flex; gap:12px; }
.name-row .field { flex:1; }

.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-size:14px; color:#4b5563; font-weight:500; }

.input-wrap { position:relative; display:flex; align-items:center; }
.input-with-icon { width:100%; padding-right:44px !important; }
.eye-btn { position:absolute; right:14px; background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; align-items:center; padding:0; transition:color .15s; }
.eye-btn:hover { color:#ae68fa; }

.input { border-radius:24px; border:1px solid #e0ddf7; padding:11px 16px; font-size:14px; outline:none; width:100%; box-sizing:border-box; transition:border-color .15s, box-shadow .15s; }
.input:focus { border-color:#ae68fa; box-shadow:0 0 0 3px rgba(174,104,250,.18); }

.msg { font-size:13px; padding:10px 14px; border-radius:10px; }
.error   { background:#fee2e2; color:#dc2626; }
.success { background:#dcfce7; color:#16a34a; }

.btn-primary { width:100%; padding:12px; border-radius:999px; border:none; background:linear-gradient(90deg,#ae68fa,#f1966e); color:#fff; font-size:15px; font-weight:600; cursor:pointer; transition:opacity .15s; }
.btn-primary:hover    { opacity:.9; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }

.switch-text { font-size:14px; color:#6b7280; text-align:center; }
.link { color:#ae68fa; font-weight:600; text-decoration:none; }
.link:hover { text-decoration:underline; }

@media (max-width:900px) {
  .page { padding:24px 16px; }
  .decor { display:none; }
  .form-card { padding:32px 24px; }
  .name-row { flex-direction:column; }
}
</style>