<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AdminRole, AdminStatus, AdminStatsResponse } from '../../services/adminService'

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: AdminRole
  status: AdminStatus
  lastLogin: string
}

const props = withDefaults(defineProps<{
  variant?: 'dashboard' | 'users-full'
  users: AdminUserRow[]
  stats: AdminStatsResponse | null
  loading?: boolean
}>(), {
  variant: 'dashboard',
  loading: false,
})

const emit = defineEmits<{
  (e: 'view-all-users'): void
  (e: 'full-audit'): void
  (e: 'filters-change', payload: { search: string; role: 'all' | AdminRole; status: 'all' | AdminStatus }): void
  (e: 'suspend-user', user: AdminUserRow): void
  (e: 'restore-user', user: AdminUserRow): void
  (e: 'delete-user', user: AdminUserRow): void
  (e: 'change-role', user: AdminUserRow): void
}>()

const search = ref('')
const roleFilter = ref<'all' | AdminRole>('all')
const statusFilter = ref<'all' | AdminStatus>('all')

watch([search, roleFilter, statusFilter], () => {
  emit('filters-change', { search: search.value, role: roleFilter.value, status: statusFilter.value })
})

const users = computed(() => props.users)
const stats = computed(() => ({
  total: props.stats?.total ?? 0,
  totalTrend: `Active: ${props.stats?.active ?? 0}`,
  inactive: props.stats?.inactive ?? 0,
  managers: props.stats?.by_role.manager ?? 0,
  suspended: props.stats?.suspended ?? 0,
}))

const filteredUsers = computed(() => users.value)

const auditEntries = [
  { kind: 'create' as const, text: 'Account created — Pedro Reyes by Brylle (Admin)', time: '2m ago' },
  { kind: 'role' as const, text: 'Role changed — Maria Reyes Tenant → Manager by Brylle', time: '1h ago' },
  { kind: 'suspend' as const, text: 'Account suspended — Pedro Lim by Brylle (Admin)', time: '3h ago' },
  { kind: 'delete' as const, text: 'Account deleted — ghost_user inactive 90d by Brylle', time: '1d ago' },
  { kind: 'settings' as const, text: 'System settings updated — maintenance mode off by Brylle', time: '7d ago' },
]

const maintenanceMode = ref(false)
const newRegistrations = ref(true)
const emailNotifications = ref(true)

function roleBadgeClass(role: string) {
  const map: Record<AdminRole, string> = {
    ROLE_ADMIN: 'role-admin',
    ROLE_MANAGER: 'role-manager',
    ROLE_MAINTENANCE: 'role-maintenance',
    ROLE_TENANT: 'role-tenant',
  }
  return map[role as AdminRole] ?? ''
}

function statusBadgeClass(status: string) {
  return (
    {
      ACTIVE: 'st-active',
      SUSPENDED: 'st-suspended',
      INACTIVE: 'st-inactive',
    } as const
  )[status as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'] ?? ''
}

function roleLabel(role: AdminRole): string {
  const map: Record<AdminRole, string> = {
    ROLE_ADMIN: 'Admin',
    ROLE_MANAGER: 'Manager',
    ROLE_MAINTENANCE: 'Maintenance',
    ROLE_TENANT: 'Tenant',
  }
  return map[role] ?? 'Tenant'
}

function auditIconBg(kind: (typeof auditEntries)[number]['kind']) {
  const map = {
    create: 'rgba(34,197,94,.15)',
    role: 'rgba(20,184,166,.15)',
    suspend: 'rgba(239,68,68,.15)',
    delete: 'rgba(100,116,139,.15)',
    settings: 'rgba(234,179,8,.15)',
  }
  return map[kind]
}

function auditGlyph(kind: (typeof auditEntries)[number]['kind']) {
  const map = {
    create: '+',
    role: '↻',
    suspend: '!',
    delete: '×',
    settings: '⚙',
  }
  return map[kind]
}
</script>

<template>
  <section class="section">
    <template v-if="variant === 'dashboard'">
      <div class="section-hdr">
        <div>
          <h1 class="section-title">Admin dashboard</h1>
          <p class="section-sub">User access, audit trail, and system controls</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Total accounts</span>
            <div class="stat-icon" style="background: rgba(59,130,246,.12)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-sub sub-up">{{ stats.totalTrend }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Inactive accounts</span>
            <div class="stat-icon" style="background: rgba(239,68,68,.12)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ stats.inactive }}</div>
          <div class="stat-sub sub-alert">needs cleanup</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Managers</span>
            <div class="stat-icon" style="background: rgba(34,197,94,.12)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ stats.managers }}</div>
          <div class="stat-sub">active managers</div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">Suspended</span>
            <div class="stat-icon" style="background: rgba(234,179,8,.15)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ stats.suspended }}</div>
          <div class="stat-sub">flagged user</div>
        </div>
      </div>

      <div class="dash-split">
        <!-- User accounts -->
        <div class="card accounts-card">
          <div class="card-hdr">
            <span class="card-title">User accounts</span>
            <button type="button" class="card-link" @click="emit('view-all-users')">View all</button>
          </div>
          <div class="filters">
            <input
              v-model="search"
              type="search"
              class="search-input"
              placeholder="Search by name or email..."
              aria-label="Search users"
            >
            <select v-model="roleFilter" class="filter-select" aria-label="Filter by role">
              <option value="all">All roles</option>
              <option value="ROLE_ADMIN">Admin</option>
              <option value="ROLE_MANAGER">Manager</option>
              <option value="ROLE_MAINTENANCE">Maintenance</option>
              <option value="ROLE_TENANT">Tenant</option>
            </select>
            <select v-model="statusFilter" class="filter-select" aria-label="Filter by status">
              <option value="all">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="5" class="td-muted">Loading users...</td>
                </tr>
                <tr v-for="u in filteredUsers" :key="u.id">
                  <td>
                    <div class="user-cell">
                      <div class="user-av">{{ u.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2) }}</div>
                      <div class="user-text">
                        <span class="user-name">{{ u.name }}</span>
                        <span class="user-email">{{ u.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="pill" :class="roleBadgeClass(u.role)">{{ roleLabel(u.role) }}</span>
                  </td>
                  <td>
                    <span class="pill" :class="statusBadgeClass(u.status)">{{ u.status.charAt(0) + u.status.slice(1).toLowerCase() }}</span>
                  </td>
                  <td class="td-muted">{{ u.lastLogin }}</td>
                  <td>
                    <div class="actions">
                      <template v-if="u.status === 'ACTIVE'">
                        <button type="button" class="link-btn" @click="emit('change-role', u)">Edit role</button>
                        <button type="button" class="link-btn danger" @click="emit('suspend-user', u)">Suspend</button>
                      </template>
                      <template v-else-if="u.status === 'SUSPENDED'">
                        <button type="button" class="link-btn" @click="emit('restore-user', u)">Restore</button>
                        <button type="button" class="link-btn danger" @click="emit('delete-user', u)">Delete</button>
                      </template>
                      <template v-else>
                        <button type="button" class="link-btn danger" @click="emit('delete-user', u)">Delete</button>
                      </template>
                    </div>
                  </td>
                </tr>
                <tr v-if="!loading && filteredUsers.length === 0">
                  <td colspan="5" class="td-muted">No users found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="side-col">
          <div class="card">
            <div class="card-hdr">
              <span class="card-title">Audit log</span>
              <button type="button" class="card-link" @click="emit('full-audit')">Full log</button>
            </div>
            <ul class="audit-list">
              <li v-for="(a, i) in auditEntries" :key="i" class="audit-item">
                <div class="audit-icon" :style="{ background: auditIconBg(a.kind) }">{{ auditGlyph(a.kind) }}</div>
                <div class="audit-body">
                  <p class="audit-text">{{ a.text }}</p>
                  <span class="audit-time">{{ a.time }}</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="card">
            <div class="card-hdr">
              <span class="card-title">System settings</span>
            </div>
            <div class="settings-list">
              <label class="setting-row">
                <div class="setting-text">
                  <span class="setting-name">Maintenance mode</span>
                  <span class="setting-desc">Blocks all non-admin logins</span>
                </div>
                <input v-model="maintenanceMode" type="checkbox" class="toggle" role="switch">
              </label>
              <label class="setting-row">
                <div class="setting-text">
                  <span class="setting-name">New registrations</span>
                  <span class="setting-desc">Allow public sign-ups</span>
                </div>
                <input v-model="newRegistrations" type="checkbox" class="toggle" role="switch">
              </label>
              <label class="setting-row">
                <div class="setting-text">
                  <span class="setting-name">Email notifications</span>
                  <span class="setting-desc">OTP + payment reminders</span>
                </div>
                <input v-model="emailNotifications" type="checkbox" class="toggle" role="switch">
              </label>
              <div class="setting-row static">
                <div class="setting-text">
                  <span class="setting-name">Auto-delete inactive</span>
                  <span class="setting-desc">After 90 days of no login</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Full-width user accounts (sidebar: User accounts) -->
    <template v-else>
      <div class="section-hdr">
        <div>
          <h1 class="section-title">User accounts</h1>
          <p class="section-sub">Search, filter, and manage roles and access</p>
        </div>
      </div>
      <div class="card accounts-card flat">
        <div class="filters">
          <input
            v-model="search"
            type="search"
            class="search-input"
            placeholder="Search by name or email..."
            aria-label="Search users"
          >
          <select v-model="roleFilter" class="filter-select" aria-label="Filter by role">
            <option value="all">All roles</option>
            <option value="ROLE_ADMIN">Admin</option>
            <option value="ROLE_MANAGER">Manager</option>
            <option value="ROLE_MAINTENANCE">Maintenance</option>
            <option value="ROLE_TENANT">Tenant</option>
          </select>
          <select v-model="statusFilter" class="filter-select" aria-label="Filter by status">
            <option value="all">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="td-muted">Loading users...</td>
              </tr>
              <tr v-for="u in filteredUsers" :key="u.id">
                <td>
                  <div class="user-cell">
                    <div class="user-av">{{ u.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2) }}</div>
                    <div class="user-text">
                      <span class="user-name">{{ u.name }}</span>
                      <span class="user-email">{{ u.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="pill" :class="roleBadgeClass(u.role)">{{ roleLabel(u.role) }}</span>
                </td>
                <td>
                  <span class="pill" :class="statusBadgeClass(u.status)">{{ u.status.charAt(0) + u.status.slice(1).toLowerCase() }}</span>
                </td>
                <td class="td-muted">{{ u.lastLogin }}</td>
                <td>
                  <div class="actions">
                    <template v-if="u.status === 'ACTIVE'">
                      <button type="button" class="link-btn" @click="emit('change-role', u)">Edit role</button>
                      <button type="button" class="link-btn danger" @click="emit('suspend-user', u)">Suspend</button>
                    </template>
                    <template v-else-if="u.status === 'SUSPENDED'">
                      <button type="button" class="link-btn" @click="emit('restore-user', u)">Restore</button>
                      <button type="button" class="link-btn danger" @click="emit('delete-user', u)">Delete</button>
                    </template>
                    <template v-else>
                      <button type="button" class="link-btn danger" @click="emit('delete-user', u)">Delete</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && filteredUsers.length === 0">
                <td colspan="5" class="td-muted">No users found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e0ddf7;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(149, 132, 226, 0.07);
}
.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.stat-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}
.stat-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: #160d27;
  letter-spacing: -0.5px;
}
.stat-sub {
  font-size: 12px;
  margin-top: 3px;
  color: #9ca3af;
}
.sub-up {
  color: #22c55e;
}
.sub-alert {
  color: #ef4444;
}

.dash-split {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  align-items: start;
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #fff;
  border: 1px solid #e0ddf7;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(149, 132, 226, 0.06);
}
.accounts-card.flat {
  margin-top: 0;
}
.card-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-title {
  font-size: 13px;
  font-weight: 700;
  color: #160d27;
}
.card-link {
  background: none;
  border: none;
  font-size: 12px;
  color: #ae68fa;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  padding: 0;
}
.card-link:hover {
  color: #f1966e;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.search-input {
  flex: 1;
  min-width: 200px;
  padding: 9px 12px;
  border: 1px solid #e0ddf7;
  border-radius: 9px;
  font-size: 13px;
  font-family: inherit;
  background: #faf7ff;
}
.search-input::placeholder {
  color: #c4b8e8;
}
.filter-select {
  padding: 9px 12px;
  border: 1px solid #e0ddf7;
  border-radius: 9px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #374151;
  cursor: pointer;
}

.table-wrap {
  overflow-x: auto;
  margin: 0 -4px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.data-table th {
  text-align: left;
  padding: 8px 10px;
  color: #c4b8e8;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f3f0fb;
}
.th-actions {
  text-align: right;
}
.data-table td {
  padding: 10px;
  border-bottom: 1px solid #f9f7ff;
  vertical-align: middle;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.data-table tr:hover td {
  background: #faf7ff;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}
.user-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.user-name {
  font-weight: 600;
  color: #160d27;
}
.user-email {
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
}
.td-muted {
  color: #6b7280;
  white-space: nowrap;
}

.pill {
  display: inline-block;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}
.role-admin {
  background: #fef9c3;
  color: #854d0e;
}
.role-manager {
  background: #ccfbf1;
  color: #0f766e;
}
.role-maintenance {
  background: #e0f2fe;
  color: #075985;
}
.role-tenant {
  background: #ede9fe;
  color: #6d28d9;
}
.st-active {
  background: #dcfce7;
  color: #166534;
}
.st-suspended {
  background: #fee2e2;
  color: #991b1b;
}
.st-inactive {
  background: #f1f5f9;
  color: #64748b;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: #ae68fa;
  cursor: pointer;
  font-family: inherit;
}
.link-btn:hover {
  text-decoration: underline;
}
.link-btn.danger {
  color: #ef4444;
}

.audit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.audit-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.audit-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  flex-shrink: 0;
}
.audit-text {
  margin: 0;
  font-size: 12px;
  color: #374151;
  line-height: 1.45;
}
.audit-time {
  font-size: 11px;
  color: #c4b8e8;
  margin-top: 2px;
  display: block;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f0fb;
  cursor: pointer;
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-row.static {
  cursor: default;
}
.setting-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.setting-name {
  font-size: 13px;
  font-weight: 600;
  color: #160d27;
}
.setting-desc {
  font-size: 11px;
  color: #9ca3af;
}

.toggle {
  appearance: none;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: #e5e7eb;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}
.toggle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 2px;
  left: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.toggle:checked {
  background: linear-gradient(90deg, #ae68fa, #f1966e);
}
.toggle:checked::after {
  transform: translateX(18px);
}

@media (max-width: 1200px) {
  .dash-split {
    grid-template-columns: 1fr;
  }
  .side-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 900px) {
  .side-col {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .actions {
    justify-content: flex-start;
  }
}
</style>
