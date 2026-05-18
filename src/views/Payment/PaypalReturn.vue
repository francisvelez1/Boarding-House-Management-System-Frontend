<script setup lang="ts">
/**
 * PayPal return / capture handler.
 *
 * After the tenant approves the payment on PayPal's hosted page, PayPal
 * redirects them back here with `?token=<order_id>&PayerID=<payer_id>`.
 *
 * This page calls `/api/payments/paypal/capture-by-token` to capture the
 * order on the server (which marks the Payment CONFIRMED), then redirects
 * the tenant back to their dashboard. The capture also surfaces in the
 * manager dashboard automatically — no manual confirmation required.
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route  = useRoute()
const router = useRouter()

const status        = ref<'capturing' | 'success' | 'error' | 'cancelled'>('capturing')
const errorMessage  = ref('')
const receiptNumber = ref('')

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
})

onMounted(async () => {
  // PayPal returns ?token=<orderId>&PayerID=<payerId>
  // Cancel page returns to a different URL but we still guard for it here.
  const path = route.path.toLowerCase()
  const cancelled =
    String(route.query.cancel ?? '') === '1' ||
    path.includes('/payment/cancel') ||
    path.includes('/payments/cancel')
  if (cancelled) {
    status.value = 'cancelled'
    setTimeout(() => router.replace('/tenant/dashboard'), 2200)
    return
  }

  const token = String(route.query.token ?? '')
  if (!token) {
    status.value       = 'error'
    errorMessage.value = 'Missing PayPal order token. Please retry your payment.'
    return
  }

  try {
    const res = await axios.post(
      '/api/payments/paypal/capture-by-token',
      null,
      { params: { token }, headers: getHeaders() },
    )
    const data = res.data?.data ?? res.data
    receiptNumber.value = data?.receipt_number ?? ''
    status.value        = 'success'
    setTimeout(() => router.replace('/tenant/dashboard'), 2200)
  } catch (e: any) {
    status.value       = 'error'
    errorMessage.value =
      e?.response?.data?.detail ??
      e?.response?.data?.message ??
      e?.message ??
      'Failed to confirm your PayPal payment.'
  }
})

function backToDashboard() {
  router.replace('/tenant/dashboard')
}
</script>

<template>
  <div class="paypal-return">
    <div class="card">
      <div v-if="status === 'capturing'" class="state">
        <div class="spinner"></div>
        <h2>Confirming your payment…</h2>
        <p>Please wait while we record your PayPal payment.</p>
      </div>

      <div v-else-if="status === 'success'" class="state success">
        <div class="check">✓</div>
        <h2>Payment confirmed!</h2>
        <p v-if="receiptNumber">Receipt: <strong>{{ receiptNumber }}</strong></p>
        <p>Returning you to your dashboard…</p>
      </div>

      <div v-else-if="status === 'cancelled'" class="state warn">
        <div class="check">!</div>
        <h2>Payment cancelled</h2>
        <p>Your PayPal payment was cancelled. No charge was made.</p>
      </div>

      <div v-else class="state error">
        <div class="check">×</div>
        <h2>We couldn't confirm your payment</h2>
        <p>{{ errorMessage }}</p>
        <button class="btn" @click="backToDashboard">Back to dashboard</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paypal-return {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f3ff 0%, #fde8ef 100%);
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 18px;
  padding: 36px 32px;
  box-shadow: 0 18px 40px -20px rgba(99, 62, 184, 0.25);
  text-align: center;
}
.state h2  { margin: 14px 0 6px; font-size: 22px; color: #1f2937; }
.state p   { color: #6b7280; font-size: 14px; line-height: 1.55; }
.check {
  width: 64px; height: 64px; margin: 0 auto;
  border-radius: 50%; display: grid; place-items: center;
  font-size: 36px; font-weight: 700; color: #fff;
}
.success .check  { background: linear-gradient(135deg, #34d399, #10b981); }
.warn   .check   { background: linear-gradient(135deg, #facc15, #f59e0b); }
.error  .check   { background: linear-gradient(135deg, #f87171, #ef4444); }
.spinner {
  width: 48px; height: 48px; margin: 0 auto;
  border-radius: 50%;
  border: 4px solid #f3f0fb;
  border-top-color: #ae68fa;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.btn {
  margin-top: 14px; padding: 10px 18px;
  border: none; border-radius: 999px;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  color: #fff; font-weight: 600; cursor: pointer;
}
</style>
