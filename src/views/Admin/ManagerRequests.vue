<script setup lang="ts">
import { ref } from 'vue'
import { managerRequestService, type ManagerRoleRequestItem } from '../../services/managerRequestService'

const props = defineProps<{
  managerRequests: ManagerRoleRequestItem[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const viewingManagerReq = ref<ManagerRoleRequestItem | null>(null)
const rejectReason = ref('')
const confirmRejectId = ref('')
const error = ref('')

function viewManagerRequest(r: ManagerRoleRequestItem) { viewingManagerReq.value = r }
function closeManagerReqModal() { viewingManagerReq.value = null; confirmRejectId.value = ''; rejectReason.value = '' }

async function approveManagerRequest(id: string) {
  try {
    await managerRequestService.review(id, { status: 'APPROVED' })
    closeManagerReqModal()
    emit('refresh')
  } catch (e: any) { error.value = e?.message ?? 'Failed to approve request.' }
}

async function rejectManagerRequest(id: string) {
  if (!confirmRejectId.value) { confirmRejectId.value = id; return }
  try {
    await managerRequestService.review(id, { status: 'REJECTED', review_notes: rejectReason.value || 'Rejected by admin' })
    closeManagerReqModal()
    emit('refresh')
  } catch (e: any) { error.value = e?.message ?? 'Failed to reject request.' }
}
</script>

<template>
  <section class="section">
    <div v-if="error" class="error-banner">{{ error }}</div>
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
            <td style="display:flex;gap:6px;">
              <button class="action-btn view" @click="viewManagerRequest(r)">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Manager Request View Modal ── -->
    <Teleport to="body">
      <div v-if="viewingManagerReq" class="modal-overlay" @click.self="closeManagerReqModal">
        <div class="modal-card">
          <button class="modal-close" @click="closeManagerReqModal">✕</button>
          <div class="modal-header">
            <div class="modal-icon">&#127970;</div>
            <h2>Manager Application</h2>
            <p class="modal-sub">Submitted application details</p>
          </div>

          <div class="view-grid">
            <div class="view-field"><span class="vf-label">Property Name</span><span class="vf-val">{{ viewingManagerReq.property_name }}</span></div>
            <div class="view-field"><span class="vf-label">Location / City</span><span class="vf-val">{{ viewingManagerReq.location }}</span></div>
            <div class="view-field"><span class="vf-label">Full Address</span><span class="vf-val">{{ viewingManagerReq.address }}</span></div>
            <div class="view-field"><span class="vf-label">No. of Rooms</span><span class="vf-val">{{ viewingManagerReq.room_count }}</span></div>
            <div class="view-field" v-if="(viewingManagerReq as any).description"><span class="vf-label">Description</span><span class="vf-val">{{ (viewingManagerReq as any).description }}</span></div>
            <div class="view-field"><span class="vf-label">Status</span><span class="vf-val"><span class="badge" :class="viewingManagerReq.status.toLowerCase()">{{ viewingManagerReq.status }}</span></span></div>
            <div class="view-field"><span class="vf-label">Submitted</span><span class="vf-val">{{ new Date(viewingManagerReq.created_at).toLocaleString() }}</span></div>
            <div class="view-field" v-if="viewingManagerReq.review_notes"><span class="vf-label">Review Notes</span><span class="vf-val">{{ viewingManagerReq.review_notes }}</span></div>
          </div>

          <template v-if="viewingManagerReq.status === 'PENDING'">
            <div v-if="confirmRejectId === viewingManagerReq.id" class="field" style="margin-top:8px">
              <label style="font-size:13px;color:#4b5563;font-weight:500">Reason for rejection</label>
              <input v-model="rejectReason" type="text" placeholder="Optional reason"
                     style="margin-top:4px;padding:8px 14px;border-radius:12px;border:1px solid #e0ddf7;font-size:13px;width:100%;box-sizing:border-box;outline:none" />
            </div>
            <div class="modal-actions">
              <button class="btn-approve" @click="approveManagerRequest(viewingManagerReq.id)">&#10003; Approve</button>
              <button class="btn-reject"  @click="rejectManagerRequest(viewingManagerReq.id)">
                {{ confirmRejectId === viewingManagerReq.id ? 'Confirm Reject' : '&#10007; Reject' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.error-banner { margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 12px; }
.section-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.section-title { font-size: 22px; font-weight: 700; color: #160d27; }
.section-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
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
.action-btn.view { background: #eff6ff; color: #2563eb; }
</style>

<style>
.modal-overlay { position:fixed;inset:0;background:rgba(17,24,39,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px; }
.modal-card    { position:relative;width:100%;max-width:480px;background:#fff;border-radius:24px;padding:32px 36px 28px;box-shadow:0 24px 64px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:14px;max-height:90vh;overflow-y:auto; }
.modal-close   { position:absolute;top:14px;right:16px;background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer; }
.modal-close:hover { color:#111827; }
.modal-header  { text-align:center; }
.modal-icon    { font-size:40px;margin-bottom:6px; }
.modal-header h2 { font-size:20px;font-weight:800;color:#111827;margin:0 0 4px; }
.modal-sub     { font-size:13px;color:#6b7280;margin:0; }
.view-grid     { display:flex;flex-direction:column;gap:8px;margin-top:4px; }
.view-field    { display:flex;flex-direction:column;gap:2px;padding:10px 14px;background:#f9fafb;border-radius:10px; }
.vf-label      { font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em; }
.vf-val        { font-size:14px;color:#111827;font-weight:500; }
.modal-actions { display:flex;gap:10px;margin-top:4px; }
.btn-approve   { flex:1;padding:10px;border-radius:999px;border:none;background:#dcfce7;color:#16a34a;font-size:14px;font-weight:600;cursor:pointer; }
.btn-approve:hover { opacity:.85; }
.btn-reject    { flex:1;padding:10px;border-radius:999px;border:none;background:#fee2e2;color:#dc2626;font-size:14px;font-weight:600;cursor:pointer; }
.btn-reject:hover  { opacity:.85; }
</style>
