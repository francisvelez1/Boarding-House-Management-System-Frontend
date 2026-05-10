<script setup lang="ts">
import type { Room } from '../../models/room'
import {
  RoomStatus,
  CARD_BG, ICON_COLOR, STATUS_COLOR, STATUS_LABEL, FLOOR_LABEL, TYPE_LABEL,
  formatPrice, moveInTotal, requiredDeposit, requiredAdvance,
} from '../../models/room'
import type { ManagerInfo } from '../../models/room'

defineProps<{ room: Room }>()
const emit = defineEmits<{ (e: 'inquire', room: Room): void }>()
</script>

<template>
  <div class="room-card">
    <!-- Image / placeholder -->
    <div class="room-img" :style="{ background: CARD_BG[room.status] }">
      <span class="status-badge" :style="{ background: STATUS_COLOR[room.status] }">
        {{ STATUS_LABEL[room.status] }}
      </span>

      <!-- Real photo if available -->
      <img v-if="room.images.length" :src="room.images[0]" class="room-photo" :alt="room.room_number">
      <svg v-else class="room-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 36V20L24 8L40 20V36H28V26H20V36H8Z"
          :stroke="ICON_COLOR[room.status]"
          stroke-width="2.5"
          stroke-linejoin="round"
        />
      </svg>

      <!-- Occupancy pill -->
      <span class="occupancy-pill">
        {{ room.current_occupants }}/{{ room.max_occupants }}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
      </span>
    </div>

    <!-- Info -->
    <div class="room-info">
      <!-- Property Header -->
      <div v-if="room.property_name || room.location" class="property-header">
        <div v-if="room.property_name" class="property-name">{{ room.property_name }}</div>
        <div v-if="room.location" class="property-location">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ room.location }}
        </div>
      </div>

      <!-- Room Title -->
      <div class="room-name">
        Room {{ room.room_number }}
        <span class="type-tag">{{ TYPE_LABEL[room.room_type] }}</span>
      </div>

      <!-- Room Meta -->
      <div class="room-meta">
        <span v-if="room.floor_level" class="meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
          {{ FLOOR_LABEL[room.floor_level] }}
        </span>
        <span class="meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          Max {{ room.max_occupants }}
        </span>
      </div>

      <!-- Description -->
      <div v-if="room.description" class="room-description">
        {{ room.description }}
      </div>

      <!-- Full Address -->
      <div v-if="room.address" class="room-address">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        {{ room.address }}
      </div>

      <!-- Dimensions -->
      <div v-if="room.dimension?.length_sqm || room.dimension?.width_sqm" class="dimension-row">
        <span v-if="room.dimension.length_sqm" class="dim-item">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/></svg>
          Length: {{ room.dimension.length_sqm }} sqm
        </span>
        <span v-if="room.dimension.width_sqm" class="dim-item">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/></svg>
          Width: {{ room.dimension.width_sqm }} sqm
        </span>
        <span v-if="room.dimension.length_sqm && room.dimension.width_sqm" class="dim-item dim-area">
          Area: {{ (room.dimension.length_sqm * room.dimension.width_sqm).toFixed(1) }} sqm
        </span>
      </div>

      <!-- Amenities (only working ones shown) -->
      <div class="amenity-tags">
        <span
          v-for="a in room.amenities.filter(a => a.is_working)"
          :key="a.name"
          class="amenity-tag"
          :title="a.description ?? ''"
        >{{ a.name }}</span>
        <span v-if="room.amenities.filter(a => !a.is_working).length" class="amenity-tag broken">
          {{ room.amenities.filter(a => !a.is_working).length }} broken
        </span>
      </div>

      <!-- Manager Info -->
      <div v-if="room.manager_info" class="manager-info">
        <div class="mi-avatar">{{ room.manager_info.full_name.slice(0,1).toUpperCase() }}</div>
        <div class="mi-body">
          <div class="mi-name">{{ room.manager_info.full_name }}</div>
          <div class="mi-contact">
            <span v-if="room.manager_info.phone">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.21 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
              {{ room.manager_info.phone }}
            </span>
            <span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {{ room.manager_info.email }}
            </span>
          </div>
        </div>
      </div>

      <!-- Financial breakdown -->
      <div class="price-breakdown">
        <div class="price-row main">
          <span>Monthly rent</span>
          <span class="price-val">{{ formatPrice(room.monthly_rate) }}</span>
        </div>
        <div class="price-row sub">
          <span>Deposit (×{{ room.deposit_multiplier }})</span>
          <span>{{ formatPrice(requiredDeposit(room)) }}</span>
        </div>
        <div class="price-row sub">
          <span>Advance (×{{ room.advance_multiplier }})</span>
          <span>{{ formatPrice(requiredAdvance(room)) }}</span>
        </div>
        <div class="price-divider"></div>
        <div class="price-row move-in">
          <span>Move-in total</span>
          <span>{{ formatPrice(moveInTotal(room)) }}</span>
        </div>
      </div>

      <button
        class="btn-inquire"
        :disabled="room.status !== RoomStatus.VACANT"
        @click="emit('inquire', room)"
      >
        {{ room.status === RoomStatus.VACANT ? 'Inquire' : STATUS_LABEL[room.status] }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.room-card {
  background: #FFFF; border-radius: 18px; overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex; flex-direction: column;
}
.room-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.18); }

/* Image area */
.room-img {
  height: 160px; display: flex; align-items: center;
  justify-content: center; position: relative; flex-shrink: 0;
}
.room-photo { width: 100%; height: 100%; object-fit: cover; }
.room-icon  { width: 64px; height: 64px; }

.status-badge {
  position: absolute; top: 12px; left: 12px;
  padding: 4px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 700; color: #fff;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.occupancy-pill {
  position: absolute; top: 12px; right: 12px;
  display: flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
  color: #fff; font-size: 11px; font-weight: 600;
  padding: 4px 8px; border-radius: 6px;
}

/* Info */
.room-info { padding: 16px; display: flex; flex-direction: column; flex: 1; }
.room-name {
  font-size: 15px; font-weight: 700; color: #1F2937;
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.type-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  background: rgba(129,140,248,0.15); color: #818cf8;
  padding: 2px 7px; border-radius: 5px; letter-spacing: 0.4px;
}

.room-meta {
  display: flex; gap: 12px; margin-bottom: 10px;
}
.meta-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #9ca3af;
}

/* Property header */
.property-header {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.property-name {
  font-size: 13px; font-weight: 700; color: #3730a3;
}
.property-location {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #6b7280; margin-top: 2px;
}

/* Description & Address */
.room-description {
  font-size: 12px; color: #4b5563; line-height: 1.5;
  margin-bottom: 10px; padding: 8px; border-radius: 8px;
  background: rgba(174,104,250,0.05);
}
.room-address {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 11px; color: #6b7280; line-height: 1.4;
  margin-bottom: 10px;
}

/* Dimensions */
.dimension-row {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-bottom: 10px;
}
.dim-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #6b7280;
  background: rgba(0,0,0,0.04); padding: 3px 8px;
  border-radius: 6px;
}
.dim-area {
  color: #4b5563; font-weight: 600;
}

.amenity-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
.amenity-tag {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
  color: #4B5563; font-size: 11px; font-weight: 600;
  padding: 3px 8px; border-radius: 6px;
}
.amenity-tag.broken {
  background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);
  color: #f87171;
}

/* Price breakdown */
.price-breakdown {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px; padding: 10px 12px;
  margin-bottom: 14px; flex: 1;
}
.price-row {
  display: flex; justify-content: space-between;
  font-size: 12px; color: #9ca3af; margin-bottom: 4px;
}
.price-row.main   { color: #4B5563; font-weight: 600; }
.price-row.main .price-val { color: #818cf8; font-size: 15px; font-weight: 700; }
.price-row.move-in { color: #1F2937; font-weight: 700; margin-bottom: 0; }
.price-divider {
  height: 1px; background: rgba(255,255,255,0.08);
  margin: 6px 0;
}

.btn-inquire {
  width: 100%; background: #fff; color: #1c1c27; border: none;
  padding: 10px; border-radius: 10px;
  font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s;
}
.btn-inquire:hover:not(:disabled) { background: #ae68fa; color: #fff; }
.btn-inquire:disabled {
  background: rgba(255,255,255,0.08); color: #6b7280; cursor: not-allowed;
}

/* Manager info */
.manager-info {
  display: flex; align-items: center; gap: 10px;
  background: #f5f3ff; border-radius: 10px;
  padding: 8px 12px; margin-bottom: 12px;
}
.mi-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #ae68fa, #f1966e);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.mi-body { min-width: 0; }
.mi-name {
  font-size: 12px; font-weight: 700; color: #3730a3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mi-contact {
  display: flex; flex-direction: column; gap: 2px; margin-top: 2px;
}
.mi-contact span {
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; color: #6b7280;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
</style>