<script setup lang="ts">
import BaseCard from './Card.vue'

export interface MaintenanceRequest {
  id: number
  title: string
  submittedDate: string  // e.g. 'Submitted Mar 15'
  status: 'In progress' | 'Done' | 'Pending'
}

defineProps<{ requests: MaintenanceRequest[] }>()
const emit = defineEmits<{ submitNew: [] }>()

const statusColor: Record<string, string> = {
  'In progress': 'amber',
  'Done': 'green',
  'Pending': 'blue',
}
</script>

<template>
  <BaseCard title="Maintenance requests" link-text="View all" link-href="#">
    <div
      v-for="req in requests"
      :key="req.id"
      class="maint-item"
    >
      <!-- Dot indicator -->
      <span :class="['maint-dot', `maint-dot--${statusColor[req.status]}`]" />

      <!-- Info -->
      <div class="maint-info">
        <span class="maint-info__title">{{ req.title }}</span>
        <span class="maint-info__meta">
          {{ req.submittedDate }} · {{ req.status === 'Done' ? 'Completed' : req.status }}
        </span>
      </div>

      <!-- Status badge -->
      <span :class="['maint-badge', `maint-badge--${statusColor[req.status]}`]">
        {{ req.status }}
      </span>
    </div>

    <button class="submit-btn" @click="emit('submitNew')">
      + Submit new request
    </button>
  </BaseCard>
</template>

<style scoped>
.maint-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.maint-item:last-child {
  border-bottom: none;
}

.maint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.maint-dot--amber { background: #f39c12; }
.maint-dot--green { background: #1a8a52; }
.maint-dot--blue  { background: #4f6ef7; }

.maint-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.maint-info__title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.maint-info__meta {
  font-size: 12px;
  color: #999;
}

.maint-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.maint-badge--amber {
  background: #fff8e6;
  color: #b07d0a;
}

.maint-badge--green {
  background: #e6f9f0;
  color: #1a8a52;
}

.maint-badge--blue {
  background: #eef1ff;
  color: #4f6ef7;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.submit-btn:hover {
  background: #f5f5f5;
  border-color: #aaa;
}
</style>