<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { useAuthStore } from '../../stores/auth'
import LeaseCard from '../../components/TenantsUI_Components/LeaseCard.vue'
import PaymentsCard from '../../components/TenantsUI_Components/PaymentsCard.vue'
import MaintenanceCard from '../../components/TenantsUI_Components/MaintenanceCard.vue'
import MessagesCard from '../../components/TenantsUI_Components/MessageCard.vue'
import { getTenant, getLease, getPayments, getMaintenanceRequests, getMessages } from "../../services/tenantService";
import { maintenanceService } from "../../services/maintenanceService";
import router from "../../router";

const auth = useAuthStore()

const username = auth.user?.username ?? 'Tenant'
const initials = username.slice(0, 2).toUpperCase()

const tenant = ref<any>(null);
const lease = ref<any>(null);
const payments = ref<any[]>([]);
const maintenanceRequests = ref<any[]>([]);
const messages = ref<any[]>([]);
const loading = ref(true)   // ✅ track loading state
const error = ref('')       // ✅ track errors

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
  const tenantId = auth.user?.id?.toString() ?? ''

  // ✅ Log so we can see what's happening
  console.log('tenantId:', tenantId)

  try {
    // ✅ Fetch all in parallel for speed, catch individual failures
    const [t, l, p, m, msg] = await Promise.allSettled([
      getTenant(tenantId),
      getLease(tenantId),
      getPayments(tenantId),
      getMaintenanceRequests(tenantId),
      getMessages(tenantId),
    ])

    console.log('tenant result:', t)
    console.log('lease result:', l)

    if (t.status === 'fulfilled')   tenant.value              = t.value
    if (l.status === 'fulfilled')   lease.value               = l.value
    if (p.status === 'fulfilled')   payments.value            = p.value ?? []
    if (m.status === 'fulfilled')   maintenanceRequests.value = m.value ?? []
    if (msg.status === 'fulfilled') messages.value            = msg.value ?? []

  } catch (err: any) {
    console.error('Dashboard load error:', err)
    error.value = err?.message || 'Failed to load dashboard.'
  } finally {
    loading.value = false  // ✅ always stop loading
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
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="dashboard">

    <!-- ── Navbar ───────────────────────────────── -->
    <nav class="navbar">
      <div class="navbar__brand">
        <span class="navbar__icon">🏠</span>
        <span class="navbar__name">ResidEase</span>
      </div>
      <div class="navbar__links">
        <a href="#" class="navbar__link navbar__link--active">My room</a>
        <a href="#" class="navbar__link">Payments</a>
        <a href="#" class="navbar__link">Maintenance</a>
        <a href="#" class="navbar__link">Messages</a>
      </div>
      <div class="navbar__user">
        <button class="navbar__notif-btn">
          🔔
          <span class="navbar__notif-dot" />
        </button>
        <!-- ✅ Use auth store directly — no API wait needed -->
        <div class="navbar__avatar">{{ initials }}</div>
        <span class="navbar__username">{{ username }}</span>

              <button class="navbar__logout-btn" @click="handleLogout">
                  Logout
              </button>

      </div>
    </nav>

    <!-- ── Loading State ────────────────────────── -->
    <div v-if="loading" class="loading-screen">
      <p>Loading your dashboard…</p>
    </div>

    <!-- ── Error State ──────────────────────────── -->
    <div v-else-if="error" class="error-screen">
      <p>⚠️ {{ error }}</p>
    </div>

    <!-- ── Loaded ───────────────────────────────── -->
    <template v-else>
      <header class="hero">
        <div class="hero__left">
          <h1 class="hero__greeting">
            {{ getGreeting() }}, {{ tenant?.name?.split(' ')[0] ?? username }}!
          </h1>
          <p class="hero__sub">Here's your boarding house overview for today.</p>
        </div>
        <div class="hero__stats">
          <div class="hero__stat">
            <span class="hero__stat-label">Your room</span>
            <span class="hero__stat-value">{{ tenant?.room ?? '—' }}</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-label">Floor</span>
            <span class="hero__stat-value">{{ tenant?.floor ?? '—' }}</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-label">Status</span>
            <span class="hero__stat-value hero__stat-value--status">
              {{ tenant?.status ?? 'Active' }} ✓
            </span>
          </div>
        </div>
      </header>

      <main class="content">
        <section class="section--full">
          <LeaseCard v-if="lease" :lease="lease" />
        </section>
        <section class="section--two-col">
          <PaymentsCard v-if="payments.length" :payments="payments" @pay-now="handlePayNow" />
          <MaintenanceCard :requests="maintenanceRequests" @submit-new="handleSubmitMaintenance" />
        </section>
        <section class="section--full">
          <MessagesCard v-if="messages.length" :messages="messages" @open-message="handleOpenMessage" />
        </section>
      </main>
    </template>

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

/* ── Navbar ──────────────────────────────────────────────────── */
.navbar {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #1a1a2e;
  padding: 0 32px;
  height: 56px;
}

.navbar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.navbar__icon { font-size: 18px; }

.navbar__name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.navbar__links {
  display: flex;
  gap: 4px;
  flex: 1;
}

.navbar__link {
  font-size: 13px;
  font-weight: 500;
  color: #a0a8cc;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.navbar__link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.navbar__link--active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.navbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.navbar__notif-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #a0a8cc;
  padding: 4px;
}

.navbar__notif-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  background: #e74c3c;
  border-radius: 50%;
  border: 1.5px solid #1a1a2e;
}

.navbar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #4f6ef7;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar__username {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

/* ── Hero ────────────────────────────────────────────────────── */
.hero {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%);
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero__greeting {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px;
}

.hero__sub {
  font-size: 13px;
  color: #a0a8cc;
  margin: 0;
}

.hero__stats {
  display: flex;
  gap: 12px;
}

.hero__stat {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}

.hero__stat-label {
  font-size: 11px;
  color: #a0a8cc;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hero__stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.hero__stat-value--status {
  font-size: 13px;
  color: #5de8a1;
}

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
@media (max-width: 768px) {
  .section--two-col {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .navbar__links {
    display: none;
  }
}


.navbar__logout-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;      
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.navbar__logout-btn:hover {
  background: rgba(231, 76, 60, 0.6);
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