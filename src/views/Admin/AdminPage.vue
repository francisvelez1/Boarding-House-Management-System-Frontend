<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

import DashboardSidebar from '@/components/dashboard_layout/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard_layout/DashboardTopbar.vue'
import DashboardDashboard from '@/components/dashboard_layout/DashboardDashboard.vue'
import ManagerRequests from './ManagerRequests.vue'
import RolePermissions from './RolePermissions.vue'
import AuditLogs from './AuditLogs.vue'
import SystemHealth from './SystemHealth.vue'
import SystemSettings from './SystemSettings.vue'
import { adminService, type AdminRole, type AdminStatsResponse, type AdminStatus, type AdminUserSummary } from '../../services/adminService'
import { managerRequestService, type ManagerRoleRequestItem } from '../../services/managerRequestService'

type AdminUserRow = {
  id: string
  name: string
  email: string
  role: AdminRole
  status: AdminStatus
  lastLogin: string
  lastLoginTitle: string
}

const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(true)
const activeSection = ref('dashboard')
const loading = ref(false)
const error = ref('')
const users = ref<AdminUserRow[]>([])
const stats = ref<AdminStatsResponse | null>(null)
const filters = ref<{ search: string; role: 'all' | AdminRole; status: 'all' | AdminStatus }>({
  search: '',
  role: 'all',
  status: 'all',
})

const managerRequests     = ref<ManagerRoleRequestItem[]>([])

async function navigate(section: string) {
  activeSection.value = section
}

async function fetchManagerRequests() {
  try {
    const res = await managerRequestService.listAll({ status: 'PENDING', limit: 50 })
    managerRequests.value = res.requests ?? []
  } catch (e: any) {
    // Isolate this error — don't overwrite a dashboard-level error
    // The 401 here is a managerRequestService URL/auth bug; log it without breaking the page
    console.warn('Manager requests unavailable:', e?.message ?? e)
    managerRequests.value = []
  }
}

function handleLogout() {
  auth.logout()
  router.push('/')
}

function toRoleLabel(role: AdminRole): string {
  const map: Record<AdminRole, string> = {
    ROLE_ADMIN: 'Admin',
    ROLE_MANAGER: 'Manager',
    ROLE_MAINTENANCE: 'Maintenance',
    ROLE_TENANT: 'Tenant',
  }
  return map[role] ?? 'Tenant'
}

// Cell text: short, scannable. Recent sessions read as "Xm/h ago" so a
// quick glance shows live activity; older sessions fall back to an
// absolute calendar date so the column never becomes a meaningless
// "423d ago".
function formatLastLogin(value?: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  // > 1 week: absolute date is more informative.
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Tooltip (title attribute): always the full localized timestamp so an
// admin can hover any cell and see the exact session moment.
function formatLastLoginFull(value?: string | null): string {
  if (!value) return 'Has never logged in'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function mapUser(u: AdminUserSummary): AdminUserRow {
  return {
    id: u.id,
    name: u.full_name || u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    lastLogin:      formatLastLogin(u.last_login),
    lastLoginTitle: formatLastLoginFull(u.last_login),
  }
}

async function fetchAdminData() {
  loading.value = true
  error.value = ''
  try {
    const params: {
      page: number
      limit: number
      search?: string
      role?: AdminRole
      status?: AdminStatus
    } = { page: 1, limit: 100 }

    if (filters.value.search.trim()) params.search = filters.value.search.trim()
    if (filters.value.role !== 'all') params.role = filters.value.role
    if (filters.value.status !== 'all') params.status = filters.value.status

    // Use allSettled so a failing stats endpoint doesn't crash the whole dashboard
    const [usersResult, statsResult] = await Promise.allSettled([
      adminService.listUsers(params),
      adminService.getStats(),
    ])

    if (usersResult.status === 'fulfilled') {
      users.value = usersResult.value.users.map(mapUser)
    } else {
      error.value = usersResult.reason?.message ?? 'Failed to load users.'
    }

    if (statsResult.status === 'fulfilled') {
      stats.value = statsResult.value
    } else {
      // Stats failure is non-fatal — dashboard still renders without them
      console.warn('Stats unavailable:', statsResult.reason?.message)
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load admin data.'
  } finally {
    loading.value = false
  }
}

function onExportLogs() {
  navigate('audit')
}

function onViewAllUsers() {
  navigate('users')
}

function onFullAudit() {
  navigate('audit')
}

async function onSuspendUser(user: AdminUserRow) {
  if (!window.confirm(`Suspend ${user.name}?`)) return
  await adminService.updateStatus(user.id, 'SUSPENDED')
  await fetchAdminData()
}

async function onRestoreUser(user: AdminUserRow) {
  if (!window.confirm(`Restore ${user.name} to ACTIVE status?`)) return
  await adminService.updateStatus(user.id, 'ACTIVE')
  await fetchAdminData()
}

async function onDeleteUser(user: AdminUserRow) {
  if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return
  await adminService.deleteUser(user.id)
  await fetchAdminData()
}

async function onChangeRole(user: AdminUserRow) {
  const current = toRoleLabel(user.role)
  const nextRaw = window.prompt(
    `Change role for ${user.name}. Current: ${current}\nType one: admin, manager, maintenance, tenant`,
    current.toLowerCase(),
  )
  if (!nextRaw) return

  const normalized = nextRaw.trim().toLowerCase()
  const roleMap: Record<string, AdminRole> = {
    admin: 'ROLE_ADMIN',
    manager: 'ROLE_MANAGER',
    maintenance: 'ROLE_MAINTENANCE',
    tenant: 'ROLE_TENANT',
  }
  const nextRole = roleMap[normalized]
  if (!nextRole) {
    window.alert('Invalid role. Use: admin, manager, maintenance, tenant')
    return
  }

  await adminService.updateRole(user.id, nextRole)
  await fetchAdminData()
}

function onFiltersChange(payload: { search: string; role: 'all' | AdminRole; status: 'all' | AdminStatus }) {
  filters.value = payload
  void fetchAdminData()
}

async function onManagerRequestRefresh() {
  await Promise.all([fetchManagerRequests(), fetchAdminData()])
}

onMounted(() => {
  void fetchAdminData()
  void fetchManagerRequests()
})
</script>

<template>
  <div class="admin-shell">
    <DashboardSidebar
      :active-section="activeSection"
      :sidebar-open="sidebarOpen"
      :username="auth.user?.username"
      variant="admin"
      @navigate="navigate"
      @logout="handleLogout"
    />

    <div class="main-area">
      <DashboardTopbar
        :active-section="activeSection"
        :username="auth.user?.username"
        :notif-count="3"
        variant="admin"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
        @export-logs="onExportLogs"
      />

      <main class="content-area">
        <div v-if="error" class="error-banner">{{ error }}</div>
        <DashboardDashboard
          v-if="activeSection === 'dashboard'"
          variant="dashboard"
          :users="users"
          :stats="stats"
          :loading="loading"
          @view-all-users="onViewAllUsers"
          @full-audit="onFullAudit"
          @filters-change="onFiltersChange"
          @suspend-user="onSuspendUser"
          @restore-user="onRestoreUser"
          @delete-user="onDeleteUser"
          @change-role="onChangeRole"
        />

        <DashboardDashboard
          v-else-if="activeSection === 'users'"
          variant="users-full"
          :users="users"
          :stats="stats"
          :loading="loading"
          @view-all-users="onViewAllUsers"
          @full-audit="onFullAudit"
          @filters-change="onFiltersChange"
          @suspend-user="onSuspendUser"
          @restore-user="onRestoreUser"
          @delete-user="onDeleteUser"
          @change-role="onChangeRole"
        />

        <ManagerRequests
          v-else-if="activeSection === 'manager-requests'"
          :manager-requests="managerRequests"
          @refresh="onManagerRequestRefresh"
        />

        <RolePermissions v-else-if="activeSection === 'roles'" />

        <AuditLogs v-else-if="activeSection === 'audit'" />

        <SystemHealth v-else-if="activeSection === 'health'" />

        <SystemSettings v-else-if="activeSection === 'settings'" />

        <section v-else class="section">
          <div class="section-hdr"><div><h1 class="section-title">{{ activeSection }}</h1></div></div>
        </section>
      </main>
    </div>

  </div>
</template>

<style>
.admin-shell {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #f3f0fb;
  font-family: 'Inter', system-ui, sans-serif;
  overflow: hidden;
}
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  background: #f3f0fb;
}
.content-area::-webkit-scrollbar {
  width: 5px;
}
.content-area::-webkit-scrollbar-track {
  background: transparent;
}
.content-area::-webkit-scrollbar-thumb {
  background: #e0ddf7;
  border-radius: 5px;
}
.error-banner {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-size: 12px;
}

.section-hdr {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}
.section-title {
  font-size: 22px;
  font-weight: 700;
  color: #160d27;
}
.section-sub {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 2px;
}

.placeholder-card {
  background: #fff;
  border: 1.5px dashed #e0ddf7;
  border-radius: 18px;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.ph-icon {
  font-size: 52px;
}
.placeholder-card h3 {
  font-size: 18px;
  color: #374151;
  font-weight: 700;
  margin: 0;
}
.placeholder-card p {
  font-size: 13px;
  color: #9ca3af;
  max-width: 420px;
  margin: 0;
}
.placeholder-card code {
  font-size: 12px;
  background: #f3f0fb;
  padding: 2px 6px;
  border-radius: 4px;
}

.back-btn {
  margin-top: 8px;
  padding: 9px 20px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.back-btn:hover {
  opacity: 0.88;
}

.card { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; color: #9ca3af; font-weight: 600; border-bottom: 1px solid #f3f0fb; padding: 8px; }
.table td { border-bottom: 1px solid #f9f7ff; padding: 8px; }
.empty { color: #9ca3af; text-align: center; }
.badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.badge.pending  { background: #fef9c3; color: #854d0e; }
.badge.approved { background: #dcfce7; color: #166534; }
.badge.rejected { background: #fee2e2; color: #991b1b; }
.action-btn { padding: 4px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; margin-right: 6px; }
.action-btn.approve { background: #dcfce7; color: #16a34a; }
.action-btn.reject  { background: #fee2e2; color: #dc2626; }
.action-btn.view    { background: #eff6ff; color: #2563eb; }


@media (max-width: 768px) {
  .content-area {
    padding: 20px 16px;
  }
}
</style>