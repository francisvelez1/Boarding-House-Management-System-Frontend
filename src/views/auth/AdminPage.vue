<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

import DashboardSidebar from '@/components/dashboard_layout/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard_layout/DashboardTopbar.vue'
import DashboardDashboard from '@/components/dashboard_layout/DashboardDashboard.vue'
import { adminService, type AdminRole, type AdminStatsResponse, type AdminStatus, type AdminUserSummary } from '../../services/adminService'
import { managerRequestService, type ManagerRoleRequestItem } from '../../services/managerRequestService'

type AdminUserRow = {
  id: string
  name: string
  email: string
  role: AdminRole
  status: AdminStatus
  lastLogin: string
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

const managerRequests = ref<ManagerRoleRequestItem[]>([])

function navigate(section: string) {
  activeSection.value = section
}

async function fetchManagerRequests() {
  try {
    const res = await managerRequestService.listAll({ status: 'PENDING', limit: 50 })
    managerRequests.value = res.requests ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load manager requests.'
  }
}

async function approveManagerRequest(id: string) {
  if (!window.confirm('Approve this manager application?')) return
  try {
    await managerRequestService.review(id, { status: 'APPROVED' })
    await fetchManagerRequests()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to approve request.'
  }
}

async function rejectManagerRequest(id: string) {
  const reason = window.prompt('Reason for rejection:')
  if (reason === null) return
  try {
    await managerRequestService.review(id, { status: 'REJECTED', review_notes: reason || 'Rejected by admin' })
    await fetchManagerRequests()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to reject request.'
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
  return `${days}d ago`
}

function mapUser(u: AdminUserSummary): AdminUserRow {
  return {
    id: u.id,
    name: u.full_name || u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    lastLogin: formatLastLogin(u.last_login),
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

    const [usersRes, statsRes] = await Promise.all([
      adminService.listUsers(params),
      adminService.getStats(),
    ])
    users.value = usersRes.users.map(mapUser)
    stats.value = statsRes
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

        <section v-else-if="activeSection === 'manager-requests'" class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">Manager Role Requests</h1>
              <p class="section-sub">Review tenant applications to become property managers.</p>
            </div>
          </div>
          <div class="card">
            <table class="table">
              <thead><tr><th>Property</th><th>Location</th><th>Rooms</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-if="managerRequests.length === 0"><td colspan="6" class="empty">No pending manager requests</td></tr>
                <tr v-for="r in managerRequests" :key="r.id">
                  <td>{{ r.property_name }}</td>
                  <td>{{ r.location }}</td>
                  <td>{{ r.room_count }}</td>
                  <td>{{ r.address }}</td>
                  <td><span class="badge" :class="r.status.toLowerCase()">{{ r.status }}</span></td>
                  <td>
                    <button class="action-btn approve" @click="approveManagerRequest(r.id)">Approve</button>
                    <button class="action-btn reject" @click="rejectManagerRequest(r.id)">Reject</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">
                {{
                  {
                    roles: 'Roles & permissions',
                    audit: 'Audit logs',
                    health: 'System health',
                    settings: 'System settings',
                  }[activeSection] ?? activeSection
                }}
              </h1>
              <p class="section-sub">Connect this view to your admin API when ready.</p>
            </div>
          </div>
          <div class="placeholder-card">
            <div class="ph-icon">
              {{
                {
                  roles: '🛡️',
                  audit: '📋',
                  health: '💓',
                  settings: '⚙️',
                }[activeSection] ?? '🚧'
              }}
            </div>
            <h3>Module placeholder</h3>
            <p>
              This area maps to controllers such as <code>admin</code>, <code>auth</code>, and <code>config</code> on
              your backend.
            </p>
            <button class="back-btn" @click="navigate('dashboard')">← Back to dashboard</button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
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
.action-btn.approve { background: #dcfce7; color: #166534; }
.action-btn.reject  { background: #fee2e2; color: #991b1b; }

@media (max-width: 768px) {
  .content-area {
    padding: 20px 16px;
  }
}
</style>
