<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

import DashboardSidebar from '@/components/dashboard_layout/DashboardSidebar.vue'
import DashboardTopbar from '@/components/dashboard_layout/DashboardTopbar.vue'
import DashboardDashboard from '@/components/dashboard_layout/DashboardDashboard.vue'
import { adminService, type AdminRole, type AdminStatsResponse, type AdminStatus, type AdminUserSummary, type RolePermission, type AuditLogsResponse, type SystemHealthResponse, type SystemSettingsData } from '../../services/adminService'
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

async function navigate(section: string) {
  activeSection.value = section
  if (section === 'roles') await fetchRolesData()
  else if (section === 'audit') { auditPage.value = 1; await fetchAuditData() }
  else if (section === 'health') await fetchHealthData()
  else if (section === 'settings') await fetchSettingsData()
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

const sectionLoading = ref(false)
const rolesData = ref<RolePermission[]>([])
const auditData = ref<AuditLogsResponse>({ total: 0, page: 1, limit: 20, logs: [] })
const auditPage = ref(1)
const healthData = ref<SystemHealthResponse | null>(null)
const settingsData = ref<SystemSettingsData | null>(null)
const settingsSaved = ref(false)

async function fetchRolesData() {
  sectionLoading.value = true
  try {
    const res = await adminService.getRolesPermissions()
    rolesData.value = res.roles
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load roles.'
  } finally {
    sectionLoading.value = false
  }
}

async function fetchAuditData() {
  sectionLoading.value = true
  try {
    auditData.value = await adminService.getAuditLogs({ page: auditPage.value, limit: 20 })
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load audit logs.'
  } finally {
    sectionLoading.value = false
  }
}

async function fetchHealthData() {
  sectionLoading.value = true
  try {
    healthData.value = await adminService.getSystemHealth()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load system health.'
  } finally {
    sectionLoading.value = false
  }
}

async function fetchSettingsData() {
  sectionLoading.value = true
  settingsSaved.value = false
  try {
    settingsData.value = await adminService.getSystemSettings()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load settings.'
  } finally {
    sectionLoading.value = false
  }
}

async function saveSettings() {
  if (!settingsData.value) return
  try {
    await adminService.updateSystemSettings(settingsData.value)
    settingsSaved.value = true
    setTimeout(() => { settingsSaved.value = false }, 3000)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to save settings.'
  }
}

function prevAuditPage() { auditPage.value--; void fetchAuditData() }
function nextAuditPage() { auditPage.value++; void fetchAuditData() }

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
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

        <!-- Roles & Permissions -->
        <section v-else-if="activeSection === 'roles'" class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">Roles &amp; permissions</h1>
              <p class="section-sub">Role hierarchy and permission scopes for each account type.</p>
            </div>
          </div>
          <div v-if="sectionLoading" class="section-loading">Loading roles…</div>
          <div v-else class="roles-grid">
            <div v-for="r in rolesData" :key="r.role" class="card role-card">
              <div class="role-header">
                <span class="role-name">{{ r.display_name }}</span>
                <span class="role-level-badge">Level {{ r.level }}</span>
              </div>
              <code class="role-code">{{ r.role }}</code>
              <div class="perm-list">
                <span v-for="p in r.permissions" :key="p" class="perm-chip">{{ p }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Audit Logs -->
        <section v-else-if="activeSection === 'audit'" class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">Audit logs</h1>
              <p class="section-sub">Admin action history — most recent first.</p>
            </div>
            <button class="back-btn" @click="fetchAuditData()">↻ Refresh</button>
          </div>
          <div v-if="sectionLoading" class="section-loading">Loading logs…</div>
          <div v-else class="card">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Timestamp</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr>
              </thead>
              <tbody>
                <tr v-if="auditData.logs.length === 0">
                  <td colspan="6" class="empty">No audit logs yet.</td>
                </tr>
                <tr v-for="log in auditData.logs" :key="log.id">
                  <td class="log-id">#{{ log.id }}</td>
                  <td class="log-ts">{{ formatTimestamp(log.timestamp) }}</td>
                  <td><code class="action-code">{{ log.action }}</code></td>
                  <td>{{ log.actor }}</td>
                  <td><span class="target-type">{{ log.target_type }}</span> {{ log.target_id }}</td>
                  <td class="log-details">{{ JSON.stringify(log.details) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="pagination">
              <span class="page-info">Total: {{ auditData.total }}</span>
              <button :disabled="auditPage <= 1" class="page-btn" @click="prevAuditPage()">← Prev</button>
              <span class="page-num">Page {{ auditPage }}</span>
              <button :disabled="auditPage * 20 >= auditData.total" class="page-btn" @click="nextAuditPage()">Next →</button>
            </div>
          </div>
        </section>

        <!-- System Health -->
        <section v-else-if="activeSection === 'health'" class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">System health</h1>
              <p class="section-sub">Real-time system status and infrastructure overview.</p>
            </div>
            <button class="back-btn" @click="fetchHealthData()">↻ Refresh</button>
          </div>
          <div v-if="sectionLoading" class="section-loading">Loading health…</div>
          <div v-else-if="healthData" class="health-grid">
            <div class="health-card" :class="healthData.status === 'healthy' ? 'hc-healthy' : 'hc-degraded'">
              <div class="health-icon">{{ healthData.status === 'healthy' ? '✅' : '⚠️' }}</div>
              <div class="health-label">Status</div>
              <div class="health-value">{{ healthData.status }}</div>
            </div>
            <div class="health-card">
              <div class="health-icon">⏱️</div>
              <div class="health-label">Uptime</div>
              <div class="health-value">{{ formatUptime(healthData.uptime_seconds) }}</div>
            </div>
            <div class="health-card" :class="healthData.database.connected ? 'hc-healthy' : 'hc-degraded'">
              <div class="health-icon">{{ healthData.database.connected ? '🟢' : '�' }}</div>
              <div class="health-label">Database</div>
              <div class="health-value">{{ healthData.database.connected ? 'Connected' : 'Disconnected' }}</div>
            </div>
            <div class="health-card">
              <div class="health-icon">�</div>
              <div class="health-label">Total Users</div>
              <div class="health-value">{{ healthData.stats.users }}</div>
            </div>
            <div class="health-card">
              <div class="health-icon">🕐</div>
              <div class="health-label">Last Checked</div>
              <div class="health-value health-value-sm">{{ formatTimestamp(healthData.timestamp) }}</div>
            </div>
          </div>
        </section>

        <!-- System Settings -->
        <section v-else-if="activeSection === 'settings'" class="section">
          <div class="section-hdr">
            <div>
              <h1 class="section-title">System settings</h1>
              <p class="section-sub">Global configuration for ResidEase.</p>
            </div>
          </div>
          <div v-if="sectionLoading" class="section-loading">Loading settings…</div>
          <div v-else-if="settingsData" class="card settings-form">
            <div class="settings-row">
              <label class="settings-label">Site Name</label>
              <input v-model="settingsData.site_name" class="settings-input" />
            </div>
            <div class="settings-row">
              <label class="settings-label">Support Email</label>
              <input v-model="settingsData.support_email" class="settings-input" type="email" />
            </div>
            <div class="settings-row">
              <label class="settings-label">Session Timeout (minutes)</label>
              <input v-model.number="settingsData.session_timeout_minutes" class="settings-input" type="number" min="1" />
            </div>
            <div class="settings-row settings-toggle-row">
              <label class="settings-label">Maintenance Mode</label>
              <input v-model="settingsData.maintenance_mode" type="checkbox" class="settings-checkbox" />
            </div>
            <div class="settings-row settings-toggle-row">
              <label class="settings-label">Allow Registration</label>
              <input v-model="settingsData.allow_registration" type="checkbox" class="settings-checkbox" />
            </div>
            <div class="settings-actions">
              <button class="back-btn" @click="saveSettings()">Save Changes</button>
              <span v-if="settingsSaved" class="save-ok">✓ Saved successfully</span>
            </div>
          </div>
        </section>

        <section v-else class="section">
          <div class="section-hdr"><div><h1 class="section-title">{{ activeSection }}</h1></div></div>
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

/* ── Section Loading ───────────────────────────────────────── */
.section-loading {
  text-align: center;
  color: #9ca3af;
  padding: 48px;
  font-size: 14px;
}

/* ── Roles & Permissions ──────────────────────────────────── */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.role-card { padding: 18px; }
.role-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.role-name { font-weight: 700; font-size: 15px; color: #160d27; }
.role-level-badge {
  background: #f3f0fb;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
}
.role-code {
  font-size: 11px;
  color: #9ca3af;
  background: #f9f7ff;
  padding: 2px 7px;
  border-radius: 5px;
  margin-bottom: 10px;
  display: inline-block;
}
.perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.perm-chip {
  font-size: 10px;
  font-weight: 600;
  background: #ede9fe;
  color: #6d28d9;
  padding: 3px 8px;
  border-radius: 99px;
}

/* ── System Health ────────────────────────────────────────── */
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.health-card {
  background: #fff;
  border: 1px solid #e0ddf7;
  border-radius: 14px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.health-card.hc-healthy { border-color: #bbf7d0; background: #f0fdf4; }
.health-card.hc-degraded { border-color: #fca5a5; background: #fef2f2; }
.health-icon { font-size: 28px; }
.health-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.health-value { font-size: 20px; font-weight: 700; color: #160d27; }
.health-value-sm { font-size: 12px; font-weight: 600; color: #374151; }

/* ── System Settings ──────────────────────────────────────── */
.settings-form { padding: 24px; max-width: 560px; }
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f0fb;
  gap: 16px;
}
.settings-label { font-size: 13px; font-weight: 600; color: #374151; flex-shrink: 0; }
.settings-input {
  flex: 1;
  border: 1.5px solid #e0ddf7;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #160d27;
  outline: none;
  transition: border-color 0.15s;
}
.settings-input:focus { border-color: #a78bfa; }
.settings-checkbox { width: 16px; height: 16px; accent-color: #7c3aed; cursor: pointer; }
.settings-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 18px;
}
.save-ok { font-size: 12px; font-weight: 700; color: #166534; }

/* ── Audit Logs ───────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 4px;
}
.page-info { font-size: 12px; color: #9ca3af; flex: 1; }
.page-btn {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1.5px solid #e0ddf7;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  color: #374151;
}
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-num { font-size: 12px; font-weight: 600; color: #374151; }
.log-id { color: #9ca3af; font-size: 12px; }
.log-ts { font-size: 12px; color: #6b7280; white-space: nowrap; }
.action-code {
  font-size: 11px;
  background: #f3f0fb;
  color: #7c3aed;
  padding: 2px 6px;
  border-radius: 4px;
}
.target-type {
  font-size: 10px;
  background: #fef9c3;
  color: #854d0e;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}
.log-details {
  font-size: 11px;
  color: #9ca3af;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .content-area {
    padding: 20px 16px;
  }
}
</style>
