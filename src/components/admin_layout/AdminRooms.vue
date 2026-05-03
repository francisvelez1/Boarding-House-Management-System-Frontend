<script setup lang="ts">
import { ref, computed } from 'vue'

export interface RoomRow {
  id:        number
  number:    string
  type:      string
  floor:     string
  status:    string
  occupants: string
  rate:      number
  amenities: string
}

const props = defineProps<{ rooms: RoomRow[] }>()
const emit  = defineEmits<{ (e: 'add'): void; (e: 'view', r: RoomRow): void; (e: 'edit', r: RoomRow): void }>()

const search = ref('')
const filter = ref('ALL')

const filtered = computed(() => {
  let list = [...props.rooms]
  if (filter.value !== 'ALL') list = list.filter(r => r.status === filter.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(r =>
    r.number.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q) ||
    r.floor.toLowerCase().includes(q)
  )
  return list
})

const counts = computed(() => {
  const c: Record<string, number> = { ALL: props.rooms.length }
  props.rooms.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1 })
  return c
})

function statusClass(s: string) {
  return ({
    OCCUPIED:    'badge-occupied',
    VACANT:      'badge-vacant',
    MAINTENANCE: 'badge-maint',
    RESERVED:    'badge-reserved',
  } as any)[s] ?? ''
}

function typeIcon(t: string) {
  return ({ SINGLE: '🛏', DOUBLE: '🛏🛏', STUDIO: '🪟', DORMITORY: '🏠', SUITE: '✨' } as any)[t] ?? '🛏'
}

const tabs = ['ALL', 'OCCUPIED', 'VACANT', 'RESERVED', 'MAINTENANCE']

// Summary occupancy
const occupancyPct = computed(() => {
  const occ = props.rooms.filter(r => r.status === 'OCCUPIED').length
  return props.rooms.length > 0 ? Math.round((occ / props.rooms.length) * 100) : 0
})
</script>

<template>
  <section class="section">

    <!-- Header -->
    <div class="section-hdr">
      <div>
        <h1 class="section-title">Room Management</h1>
        <p class="section-sub">{{ rooms.length }} rooms · {{ occupancyPct }}% occupancy</p>
      </div>
      <div class="hdr-actions">
        <button class="btn-outline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
        <button class="btn-primary-sm" @click="emit('add')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Room
        </button>
      </div>
    </div>

    <!-- Occupancy bar -->
    <div class="occ-bar-wrap">
      <div class="occ-bar-track">
        <div class="occ-segment seg-occupied"    :style="{ width: (counts['OCCUPIED']    ?? 0) / rooms.length * 100 + '%' }" />
        <div class="occ-segment seg-reserved"    :style="{ width: (counts['RESERVED']    ?? 0) / rooms.length * 100 + '%' }" />
        <div class="occ-segment seg-maintenance" :style="{ width: (counts['MAINTENANCE'] ?? 0) / rooms.length * 100 + '%' }" />
      </div>
      <div class="occ-legend">
        <span class="leg-item"><span class="leg-dot dot-occ"/>Occupied ({{ counts['OCCUPIED'] ?? 0 }})</span>
        <span class="leg-item"><span class="leg-dot dot-vac"/>Vacant ({{ counts['VACANT'] ?? 0 }})</span>
        <span class="leg-item"><span class="leg-dot dot-res"/>Reserved ({{ counts['RESERVED'] ?? 0 }})</span>
        <span class="leg-item"><span class="leg-dot dot-mnt"/>Maintenance ({{ counts['MAINTENANCE'] ?? 0 }})</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="tab"
        :class="{ active: filter === tab }"
        @click="filter = tab"
      >
        {{ tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase() }}
        <span class="tab-count">{{ counts[tab] ?? 0 }}</span>
      </button>
    </div>

    <!-- Table card -->
    <div class="table-card">
      <div class="table-controls">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="search" class="search-input" placeholder="Search by room number, type, or floor…" />
          <button v-if="search" class="search-clear" @click="search = ''">✕</button>
        </div>
        <span class="meta-count">{{ filtered.length }} room{{ filtered.length !== 1 ? 's' : '' }}</span>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Floor</th>
              <th>Status</th>
              <th>Occupants</th>
              <th>Rate / mo</th>
              <th>Amenities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td>
                <div class="room-cell">
                  <div class="room-icon">{{ typeIcon(r.type) }}</div>
                  <strong class="room-num">{{ r.number }}</strong>
                </div>
              </td>
              <td>{{ r.type.charAt(0) + r.type.slice(1).toLowerCase() }}</td>
              <td class="text-muted">{{ r.floor }}</td>
              <td><span class="badge" :class="statusClass(r.status)">{{ r.status }}</span></td>
              <td>
                <div class="occ-cell">
                  <span :class="r.occupants.split('/')[0] === r.occupants.split('/')[1] ? 'occ-full' : 'occ-part'">
                    {{ r.occupants }}
                  </span>
                  <div class="occ-mini-bar">
                    <div class="occ-fill"
                         :style="{ width: (parseInt(r.occupants.split('/')[0] ?? '0', 10) / Math.max(parseInt(r.occupants.split('/')[1] ?? '1', 10), 1)) * 100 + '%' }"/>
                  </div>
                </div>
              </td>
              <td class="rate-cell">₱{{ r.rate.toLocaleString() }}</td>
              <td class="amenities-cell">{{ r.amenities }}</td>
              <td>
                <div class="action-row">
                  <button class="act-btn primary" @click="emit('view', r)">View</button>
                  <button class="act-btn"         @click="emit('edit', r)">Edit</button>
                </div>
              </td>
            </tr>

            <tr v-if="filtered.length === 0">
              <td colspan="8" class="empty-row">
                <div class="empty-state">
                  <span class="empty-icon">🏠</span>
                  <span>No rooms match your filters.</span>
                  <button class="clear-link" @click="search = ''; filter = 'ALL'">Clear filters</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </section>
</template>

<style scoped>
.section-hdr {
  display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px;
}
.section-title { font-size: 22px; font-weight: 700; color: #160d27; }
.section-sub   { font-size: 13px; color: #9ca3af; margin-top: 2px; }
.hdr-actions   { display: flex; gap: 8px; align-items: center; }

.btn-outline {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px;
  border: 1.5px solid #e0ddf7; background: #fff; color: #374151;
  font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: border-color .15s;
}
.btn-outline:hover { border-color: #ae68fa; }

.btn-primary-sm {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px; border: none;
  background: linear-gradient(90deg, #ae68fa, #f1966e); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity .15s;
}
.btn-primary-sm:hover { opacity: .88; }

/* ── Occupancy bar ────────────────────────────────────────────────────────── */
.occ-bar-wrap { margin-bottom: 16px; }
.occ-bar-track {
  height: 8px; border-radius: 999px; background: #f3f0fb;
  display: flex; overflow: hidden; margin-bottom: 8px;
}
.occ-segment { height: 100%; transition: width .4s ease; }
.seg-occupied    { background: #ae68fa; }
.seg-reserved    { background: #f59e0b; }
.seg-maintenance { background: #ef4444; }

.occ-legend { display: flex; gap: 14px; font-size: 11px; color: #9ca3af; }
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-dot  { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-occ { background: #ae68fa; }
.dot-vac { background: #22c55e; }
.dot-res { background: #f59e0b; }
.dot-mnt { background: #ef4444; }

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
.tab-bar { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1.5px solid #e0ddf7; }
.tab {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px;
  border: none; background: none; font-size: 13px; color: #9ca3af;
  cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent;
  margin-bottom: -1.5px; transition: color .15s, border-color .15s;
}
.tab:hover { color: #ae68fa; }
.tab.active { color: #ae68fa; border-bottom-color: #ae68fa; font-weight: 600; }
.tab-count {
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: #f3f0fb; color: #9ca3af; font-weight: 600;
}
.tab.active .tab-count { background: rgba(174,104,250,.15); color: #ae68fa; }

/* ── Table card ───────────────────────────────────────────────────────────── */
.table-card {
  background: #fff; border: 1px solid #e0ddf7; border-radius: 14px;
  box-shadow: 0 2px 12px rgba(149,132,226,.06); overflow: hidden;
}
.table-controls {
  display: flex; align-items: center; gap: 12px; padding: 14px 18px;
  border-bottom: 1px solid #f3f0fb;
}
.search-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 11px; color: #c4b8e8; pointer-events: none; }
.search-input {
  width: 100%; padding: 9px 36px 9px 34px; border: 1.5px solid #e0ddf7; border-radius: 10px;
  font-size: 13px; outline: none; font-family: inherit; background: #faf7ff; color: #160d27;
  transition: border-color .15s, box-shadow .15s;
}
.search-input:focus { border-color: #ae68fa; box-shadow: 0 0 0 3px rgba(174,104,250,.1); }
.search-input::placeholder { color: #c4b8e8; }
.search-clear {
  position: absolute; right: 11px; background: none; border: none;
  color: #c4b8e8; cursor: pointer; font-size: 12px; padding: 0; transition: color .15s;
}
.search-clear:hover { color: #ae68fa; }
.meta-count { font-size: 12px; color: #c4b8e8; white-space: nowrap; }

.table-scroll { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px; }
.data-table th {
  text-align: left; padding: 10px 16px; color: #c4b8e8; font-weight: 600;
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em;
  background: #faf7ff; border-bottom: 1px solid #e0ddf7; white-space: nowrap;
}
.data-table td {
  padding: 11px 16px; color: #374151; border-bottom: 1px solid #f3f0fb; vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover td { background: #faf7ff; }

.room-cell  { display: flex; align-items: center; gap: 8px; }
.room-icon  { font-size: 16px; }
.room-num   { font-size: 14px; font-weight: 800; color: #160d27; }
.text-muted { color: #9ca3af; }
.rate-cell  { font-weight: 700; color: #160d27; }
.amenities-cell { max-width: 200px; font-size: 11.5px; color: #9ca3af; }

/* Occupancy mini */
.occ-cell { display: flex; flex-direction: column; gap: 4px; }
.occ-full  { font-weight: 700; color: #ae68fa; font-size: 12.5px; }
.occ-part  { font-weight: 600; color: #374151; font-size: 12.5px; }
.occ-mini-bar { width: 48px; height: 4px; background: #f3f0fb; border-radius: 99px; overflow: hidden; }
.occ-fill     { height: 100%; background: linear-gradient(90deg, #ae68fa, #f1966e); border-radius: 99px; }

/* Badges */
.badge { display: inline-block; font-size: 10px; padding: 3px 9px; border-radius: 999px; font-weight: 700; white-space: nowrap; }
.badge-occupied { background: rgba(174,104,250,.12); color: #7c3aed; }
.badge-vacant   { background: #dcfce7; color: #15803d; }
.badge-maint    { background: #fee2e2; color: #991b1b; }
.badge-reserved { background: #fef3c7; color: #b45309; }

/* Actions */
.action-row { display: flex; gap: 4px; }
.act-btn {
  padding: 5px 11px; border-radius: 7px; font-size: 11px; font-weight: 600;
  cursor: pointer; border: 1px solid #e0ddf7; background: transparent; color: #9ca3af;
  font-family: inherit; transition: all .15s;
}
.act-btn:hover { background: #f9f5ff; border-color: #c4b8e8; }
.act-btn.primary { color: #ae68fa; border-color: rgba(174,104,250,.3); }
.act-btn.primary:hover { background: rgba(174,104,250,.08); border-color: #ae68fa; }

/* Empty */
.empty-row { text-align: center; padding: 40px 0; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #9ca3af; font-size: 13px; }
.empty-icon  { font-size: 36px; }
.clear-link  { background: none; border: none; color: #ae68fa; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: underline; padding: 0; }

@media (max-width: 600px) {
  .section-hdr { flex-direction: column; gap: 12px; }
  .occ-legend  { flex-wrap: wrap; gap: 8px; }
}
</style>
