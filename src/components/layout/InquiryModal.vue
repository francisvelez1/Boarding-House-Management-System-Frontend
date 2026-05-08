<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import type { Room } from '../../models/room'
import { formatPrice, moveInTotal, requiredDeposit, requiredAdvance, TYPE_LABEL, FLOOR_LABEL } from '../../models/room'

const props = defineProps<{ room: Room | null }>()
const emit  = defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()

const name = ref('')
const msg  = ref('')
const sent = ref(false)
const loading = ref(false)
const error   = ref('')

async function submit() {
  // TODO: POST /api/inquiries  { room_id, name, message }
  if (!name.value.trim()) { error.value = 'Please enter your name.'; return }
  if (!msg.value.trim())  { error.value = 'Please enter a message.'; return }
    
    sent.value = true
    loading.value = true
    error.value   = ''


    // API Call to send inquiry
    try {
    const res = await fetch('/api/inquiries', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        room_id: props.room?.id,
        name:    name.value,
        message: msg.value,
      }),
    })

    if (!res.ok) throw new Error('Failed to send inquiry.')
    sent.value = true

  } catch (err: any) {
    error.value = err?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

function close() {
  name.value = ''
  msg.value  = ''
  sent.value = false
  error.value   = ''
  loading.value = false
  emit('close')
}

</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="close">
      <div class="modal">
        <button class="modal-close" @click="close">✕</button>

        <template v-if="!sent">
          <h2 class="modal-title">Room {{ room?.room_number }}</h2>
          <p class="modal-sub">
            {{ room ? TYPE_LABEL[room.room_type] : '' }}
            <span v-if="room?.floor_level"> · {{ FLOOR_LABEL[room.floor_level] }}</span>
          </p>

          <!-- Move-in cost summary -->
          <div v-if="room" class="cost-summary">
            <div class="cost-row">
              <span>Monthly rent</span>
              <span>{{ formatPrice(room.monthly_rate) }}</span>
            </div>
            <div class="cost-row">
              <span>Security deposit (×{{ room.deposit_multiplier }})</span>
              <span>{{ formatPrice(requiredDeposit(room)) }}</span>
            </div>
            <div class="cost-row">
              <span>Advance payment (×{{ room.advance_multiplier }})</span>
              <span>{{ formatPrice(requiredAdvance(room)) }}</span>
            </div>
            <div class="cost-divider"></div>
            <div class="cost-row total">
              <span>Move-in total</span>
              <span>{{ formatPrice(moveInTotal(room)) }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Your name</label>
            <input v-model="name" type="text" placeholder="Juan Dela Cruz" class="modal-input">
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea v-model="msg" rows="3" placeholder="Hi, I'm interested in this room…" class="modal-input"></textarea>
          </div>
            <p v-if="error" class="error-msg">⚠️ {{ error }}</p>
          <button class="btn-submit" :disabled="loading" @click="submit">
            {{ loading ? 'Sending…' : 'Send Inquiry' }}
          </button>
        </template>

        <template v-else>
          <div class="success-state">
            <div class="success-icon">✅</div>
            <h2>Inquiry Sent!</h2>
            <p>We'll get back to you shortly regarding <strong>Room {{ room?.room_number }}</strong>.</p>
            <button class="btn-close" @click="close">Close</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #fff; border-radius: 24px; padding: 36px;
  width: 100%; max-width: 460px; position: relative;
  box-shadow: 0 30px 80px rgba(0,0,0,0.2);
  max-height: 90vh; overflow-y: auto;
}
.modal-close {
  position: absolute; top: 16px; right: 16px;
  background: #f3f4f6; border: none; border-radius: 50%;
  width: 32px; height: 32px; cursor: pointer; font-size: 14px; color: #6b7280;
}
.modal-title { font-size: 20px; font-weight: 800; color: #1f2937; margin-bottom: 4px; }
.modal-sub   { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }

.cost-summary {
  background: #faf7ff; border: 1px solid #e0ddf7;
  border-radius: 14px; padding: 14px 16px; margin-bottom: 20px;
}
.cost-row {
  display: flex; justify-content: space-between;
  font-size: 13px; color: #6b7280; margin-bottom: 6px;
}
.cost-row.total {
  font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 0;
}
.cost-divider { height: 1px; background: #e0ddf7; margin: 8px 0; }

.form-group  { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 6px; }
.modal-input {
  width: 100%; padding: 10px 14px; border-radius: 12px;
  border: 1px solid #e0ddf7; font-size: 14px; outline: none;
  font-family: inherit; resize: vertical; box-sizing: border-box;
}
.modal-input:focus { border-color: #ae68fa; }
.btn-submit {
  width: 100%; padding: 12px; border-radius: 24px;
  background: #ae68fa; color: #fff; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-submit:hover { background: #9d55f0; }

.success-state { text-align: center; padding: 20px 0; }
.success-icon  { font-size: 48px; margin-bottom: 16px; }
.success-state h2 { font-size: 22px; font-weight: 800; color: #1f2937; margin-bottom: 8px; }
.success-state p  { color: #6b7280; margin-bottom: 24px; }
.btn-close {
  padding: 8px 24px; border-radius: 24px;
  background: #ae68fa; color: #fff; border: none;
  font-weight: 600; font-size: 14px; cursor: pointer;
}
.error-msg {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 12px;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>