<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminService, type AuditLogsResponse } from '../../services/adminService'

const sectionLoading = ref(false)
const auditData = ref<AuditLogsResponse>({ total: 0, page: 1, limit: 20, logs: [] })
const auditPage = ref(1)
const error = ref('')

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
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

function prevAuditPage() { auditPage.value--; void fetchAuditData() }
function nextAuditPage() { auditPage.value++; void fetchAuditData() }

onMounted(fetchAuditData)
</script>

<template>
  <section class="section">
    <div v-if="error" class="error-banner">{{ error }}</div>
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
</template>

<style scoped>
.error-banner { margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 12px; }
.section-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.section-title { font-size: 22px; font-weight: 700; color: #160d27; }
.section-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
.section-loading { text-align: center; color: #9ca3af; padding: 48px; font-size: 14px; }
.card { background: #fff; border: 1px solid #e0ddf7; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; color: #9ca3af; font-weight: 600; border-bottom: 1px solid #f3f0fb; padding: 8px; }
.table td { border-bottom: 1px solid #f9f7ff; padding: 8px; }
.empty { color: #9ca3af; text-align: center; }
.back-btn { margin-top: 8px; padding: 9px 20px; border-radius: 9px; border: none; background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
.back-btn:hover { opacity: 0.88; }
.pagination { display: flex; align-items: center; gap: 10px; padding: 12px 0 4px; }
.page-info { font-size: 12px; color: #9ca3af; flex: 1; }
.page-btn { padding: 5px 12px; border-radius: 7px; border: 1.5px solid #e0ddf7; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: #374151; }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-num { font-size: 12px; font-weight: 600; color: #374151; }
.log-id { color: #9ca3af; font-size: 12px; }
.log-ts { font-size: 12px; color: #6b7280; white-space: nowrap; }
.action-code { font-size: 11px; background: #f3f0fb; color: #7c3aed; padding: 2px 6px; border-radius: 4px; }
.target-type { font-size: 10px; background: #fef9c3; color: #854d0e; padding: 1px 5px; border-radius: 4px; font-weight: 600; }
.log-details { font-size: 11px; color: #9ca3af; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
