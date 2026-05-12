<script setup lang="ts">
import { ref } from 'vue'
import type { ManagerMaintenance } from '../../services/managerService'

defineProps<{
  loading: boolean
  dashboard: { maintenance?: { submitted?: number; in_progress?: number; completed?: number } } | null
  maintenance: ManagerMaintenance[]
  formatDate: (v?: string | null) => string
  maintenanceBadgeClass: (status: string) => string
}>()

const emit = defineEmits<{
  (e: 'update-status', id: string, action: 'accept' | 'start' | 'complete' | 'reject' | 'close', payload?: { resolution?: string; rejection_reason?: string }): void
}>()

// ── Modal state ──────────────────────────────────────────────────────────

type ModalType = 'complete' | 'reject' | null

const modalType      = ref<ModalType>(null)
const activeId       = ref<string | null>(null)
const resolutionText = ref('')
const rejectionText  = ref('')
const modalError     = ref('')

function openModal(type: ModalType, id: string) {
  modalType.value      = type
  activeId.value       = id
  resolutionText.value = ''
  rejectionText.value  = ''
  modalError.value     = ''
}

function closeModal() {
  modalType.value = null
  activeId.value  = null
  modalError.value = ''
}

function confirmComplete() {
  if (!resolutionText.value.trim()) {
    modalError.value = 'Please describe the resolution.'
    return
  }
  emit('update-status', activeId.value!, 'complete', { resolution: resolutionText.value.trim() })
  closeModal()
}

function confirmReject() {
  if (!rejectionText.value.trim()) {
    modalError.value = 'Please provide a reason for rejection.'
    return
  }
  emit('update-status', activeId.value!, 'reject', { rejection_reason: rejectionText.value.trim() })
  closeModal()
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="page-hdr">
      <div>
        <h1 class="page-title">Maintenance</h1>
        <p class="page-sub">
          {{ dashboard?.maintenance?.submitted ?? 0 }} submitted ·
          {{ dashboard?.maintenance?.in_progress ?? 0 }} in progress ·
          {{ dashboard?.maintenance?.completed ?? 0 }} completed
        </p>
      </div>
    </div>

    <!-- Table -->
    <div class="panel">
      <table class="ptable full">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="td-muted">Loading…</td>
          </tr>

          <tr v-for="m in maintenance" :key="m.id">
            <td class="td-name">{{ m.title }}</td>

            <td class="td-muted">
              {{ m.description
                ? m.description.slice(0, 50) + (m.description.length > 50 ? '…' : '')
                : '—' }}
            </td>

            <td>
              <span
                class="badge"
                :class="
                  m.priority === 'HIGH' || m.priority === 'URGENT' ? 'badge-unpaid'
                  : m.priority === 'MEDIUM' ? 'badge-partial'
                  : 'badge-assigned'
                "
              >{{ m.priority }}</span>
            </td>

            <td>
              <span class="badge" :class="maintenanceBadgeClass(m.status)">
                {{ m.status.replace(/_/g, ' ') }}
              </span>
            </td>

            <td>{{ formatDate(m.created_at) }}</td>

            <!-- ── Action buttons per status ── -->
            <td class="action-cell">

              <!-- SUBMITTED → Accept + Reject -->
              <template v-if="m.status === 'SUBMITTED'">
                <button
                  class="action-btn approve"
                  @click="emit('update-status', m.id, 'accept')"
                >Accept</button>
                <button
                  class="action-btn danger"
                  @click="openModal('reject', m.id)"
                >Reject</button>
              </template>

              <!-- ASSIGNED → Start -->
              <template v-else-if="m.status === 'ASSIGNED'">
                <button
                  class="action-btn approve"
                  @click="emit('update-status', m.id, 'start')"
                >Start</button>
              </template>

              <!-- IN_PROGRESS → Complete -->
              <template v-else-if="m.status === 'IN_PROGRESS'">
                <button
                  class="action-btn approve"
                  @click="openModal('complete', m.id)"
                >Complete</button>
              </template>

              <!-- COMPLETED → Close -->
              <template v-else-if="m.status === 'COMPLETED'">
                <button
                  class="action-btn outline"
                  @click="emit('update-status', m.id, 'close')"
                >Close</button>
              </template>

              <!-- CLOSED / REJECTED → no actions -->
              <template v-else>
                <span class="td-muted">—</span>
              </template>

            </td>
          </tr>

          <tr v-if="!loading && maintenance.length === 0">
            <td colspan="6" class="td-muted">No maintenance requests.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Complete modal ── -->
    <div v-if="modalType === 'complete'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <h3 class="modal-title">Mark as Completed</h3>
        <p class="modal-sub">Describe what was done to resolve the issue.</p>
        <textarea
          v-model="resolutionText"
          class="modal-textarea"
          placeholder="Resolution notes…"
          rows="4"
        />
        <p v-if="modalError" class="modal-error">{{ modalError }}</p>
        <div class="modal-actions">
          <button class="action-btn outline" @click="closeModal">Cancel</button>
          <button class="action-btn approve" @click="confirmComplete">Confirm Complete</button>
        </div>
      </div>
    </div>

    <!-- ── Reject modal ── -->
    <div v-if="modalType === 'reject'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <h3 class="modal-title">Reject Request</h3>
        <p class="modal-sub">Provide a reason so the tenant understands why it was rejected.</p>
        <textarea
          v-model="rejectionText"
          class="modal-textarea"
          placeholder="Rejection reason…"
          rows="4"
        />
        <p v-if="modalError" class="modal-error">{{ modalError }}</p>
        <div class="modal-actions">
          <button class="action-btn outline" @click="closeModal">Cancel</button>
          <button class="action-btn danger" @click="confirmReject">Confirm Reject</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Action cell spacing */
.action-cell {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Danger button — matches your existing action-btn pattern */
.action-btn.danger {
  background: transparent;
  color: #e55353;
  border: 1px solid #e55353;
}
.action-btn.danger:hover {
  background: #e55353;
  color: #fff;
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: var(--panel-bg, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 1.75rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--text, #111);
}

.modal-sub {
  font-size: 0.85rem;
  color: var(--muted, #6b7280);
  margin: 0 0 1rem;
}

.modal-textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  color: var(--text, #111);
  background: var(--input-bg, #f9fafb);
  box-sizing: border-box;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.modal-textarea:focus {
  border-color: var(--accent, #6366f1);
}

.modal-error {
  font-size: 0.8rem;
  color: #e55353;
  margin: 0.4rem 0 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
</style>