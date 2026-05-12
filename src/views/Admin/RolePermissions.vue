<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService, type RolePermission } from '../../services/adminService'

const sectionLoading = ref(false)
const rolesData = ref<RolePermission[]>([])
const error = ref('')

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

onMounted(fetchRolesData)
</script>

<template>
  <section class="section">
    <div v-if="error" class="error-banner">{{ error }}</div>
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
</template>

<style scoped>
.error-banner { margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 12px; }
.section-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.section-title { font-size: 22px; font-weight: 700; color: #160d27; }
.section-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
.section-loading { text-align: center; color: #9ca3af; padding: 48px; font-size: 14px; }
.card { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
.roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.role-card { padding: 18px; }
.role-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.role-name { font-weight: 700; font-size: 15px; color: #160d27; }
.role-level-badge { background: #f3f0fb; color: #7c3aed; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
.role-code { font-size: 11px; color: #9ca3af; background: #f9f7ff; padding: 2px 7px; border-radius: 5px; margin-bottom: 10px; display: inline-block; }
.perm-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.perm-chip { font-size: 10px; font-weight: 600; background: #ede9fe; color: #6d28d9; padding: 3px 8px; border-radius: 99px; }
</style>
