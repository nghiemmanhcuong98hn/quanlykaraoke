// ═══════════════════════════════════════════════════════════
// Room Management — Renderer
// ═══════════════════════════════════════════════════════════

// ─── State ──────────────────────────────────────────────────
let rooms = []
let roomTypes = []
let items = []
let importHistory = []
let selectedRoomId = null
let currentPage = 'checkin'
let currentAdminSection = 'admin-rooms'
let modalMode = null // 'add-room' | 'edit-room' | 'add-type' | 'edit-type' | 'add-item' | 'edit-item' | 'record-items'
let editingId = null
let editingRoomId = null // used for record-items modal
let statsPreset = 'today'
let chartDailyInstance = null
let chartRoomInstance = null

// ─── DOM Cache ──────────────────────────────────────────────
const $ = sel => document.querySelector(sel)
const $$ = sel => document.querySelectorAll(sel)

const dom = {
  // Pages
  pageCheckin: $('#page-checkin'),
  pageAdmin: $('#page-admin'),
  sidebarCheckin: $('#sidebar-checkin'),
  sidebarAdmin: $('#sidebar-admin'),
  // Checkin
  roomList: $('#room-list'),
  emptyState: $('#empty-state'),
  roomDetail: $('#room-detail'),
  roomName: $('#room-name'),
  roomStatus: $('#room-status'),
  btnCheckIn: $('#btn-check-in'),
  btnCheckOut: $('#btn-check-out'),
  btnDeleteRoom: $('#btn-delete-room'),
  btnAddRoom: $('#btn-add-room'),
  inputPrice: $('#input-price'),
  recordsBody: $('#records-body'),
  noRecords: $('#no-records'),
  filterDate: $('#filter-date'),
  statTodayEntries: $('#stat-today-entries'),
  statTodayHours: $('#stat-today-hours'),
  statCurrentIn: $('#stat-current-in'),
  statTotalEntries: $('#stat-total-entries'),
  // Admin
  adminRoomsBody: $('#admin-rooms-body'),
  adminRoomsEmpty: $('#admin-rooms-empty'),
  adminTypesBody: $('#admin-types-body'),
  adminTypesEmpty: $('#admin-types-empty'),
  adminItemsBody: $('#admin-items-body'),
  adminItemsEmpty: $('#admin-items-empty'),
  adminImportsBody: $('#admin-imports-body'),
  adminImportsEmpty: $('#admin-imports-empty'),
  globalPriceInput: $('#global-price-input'),
  pricingTypesList: $('#pricing-types-list'),
  pricingNoTypes: $('#pricing-no-types'),
  // Stats
  statsPeriodLabel: $('#stats-period-label'),
  statsRevenuePeriod: $('#stats-revenue-period'),
  statsRevenueHourly: $('#stats-revenue-hourly'),
  statsRevenueItems: $('#stats-revenue-items'),
  statsTotalUsage: $('#stats-total-usage'),
  statsRoomBody: $('#stats-room-body'),
  statsCustomDates: $('#stats-custom-dates'),
  statsDateStart: $('#stats-date-start'),
  statsDateEnd: $('#stats-date-end'),
  statsBtnApply: $('#stats-btn-apply'),
  chartRevenueDaily: $('#chart-revenue-daily'),
  chartRevenueRoom: $('#chart-revenue-room'),
  // Modal
  modalOverlay: $('#modal-overlay'),
  modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'),
  modalClose: $('#modal-close'),
  modalCancel: $('#modal-cancel'),
  modalConfirm: $('#modal-confirm'),
  // Toast
  toastContainer: $('#toast-container')
}

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════
async function loadData() {
  try {
    const data = await window.electronAPI.invoke('db:get-data')
    rooms = data.rooms || []
    roomTypes = data.roomTypes || []
    items = data.items || []
    importHistory = data.importHistory || []
  } catch (err) {
    console.error('Failed to load data:', err)
  }
}

// ═══════════════════════════════════════════════════════════
// STATE HELPERS (depend on app state)
// ═══════════════════════════════════════════════════════════
function getSelectedRoom() {
  return rooms.find(r => r.id === selectedRoomId)
}
function isRoomOccupied(room) {
  return room && room.records.some(r => !r.checkOut)
}
function getRoomTypeName(typeId) {
  const t = roomTypes.find(t => t.id === typeId)
  return t ? t.name : '—'
}

// ─── Theme Management ───────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  applyTheme(savedTheme)
}
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme')
    $('#theme-icon-dark').style.display = 'none'
    $('#theme-icon-light').style.display = 'block'
  } else {
    document.body.classList.remove('light-theme')
    $('#theme-icon-dark').style.display = 'block'
    $('#theme-icon-light').style.display = 'none'
  }
  // Refresh charts if they exist
  if (currentPage === 'admin' && currentAdminSection === 'admin-stats') {
    renderAdminStats()
  }
}
function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme')
  const newTheme = isLight ? 'dark' : 'light'
  applyTheme(newTheme)
  localStorage.setItem('theme', newTheme)
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function switchPage(page) {
  currentPage = page
  // Nav tabs
  $$('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.page === page))
  // Sidebar pages
  dom.sidebarCheckin.style.display = page === 'checkin' ? '' : 'none'
  dom.sidebarAdmin.style.display = page === 'admin' ? '' : 'none'
  // Main pages
  dom.pageCheckin.style.display = page === 'checkin' ? '' : 'none'
  dom.pageAdmin.style.display = page === 'admin' ? '' : 'none'

  if (page === 'admin') {
    switchAdminSection(currentAdminSection)
  }
}

function switchAdminSection(section) {
  currentAdminSection = section
  $$('.admin-menu-item').forEach(m => m.classList.toggle('active', m.dataset.section === section))
  $$('.admin-section').forEach(s => (s.style.display = s.id === section ? '' : 'none'))
  renderAdminSection(section)
}

function renderAdminSection(section) {
  if (section === 'admin-rooms') renderAdminRooms()
  else if (section === 'admin-room-types') renderAdminRoomTypes()
  else if (section === 'admin-items') renderAdminItems()
  else if (section === 'admin-imports') renderAdminImports()
  else if (section === 'admin-pricing') renderAdminPricing()
  else if (section === 'admin-stats') renderAdminStats()
}

// ═══════════════════════════════════════════════════════════
// RENDER — Checkin Sidebar
// ═══════════════════════════════════════════════════════════
function renderRoomList() {
  dom.roomList.innerHTML = ''
  if (rooms.length === 0) {
    dom.roomList.innerHTML = `<div style="padding:20px 12px;text-align:center;color:var(--text-tertiary);font-size:12px;">Chưa có phòng nào.<br/>Nhấn <strong>+</strong> để thêm phòng.</div>`
    return
  }
  rooms.forEach(room => {
    const occupied = isRoomOccupied(room)
    const activeCount = room.records.filter(r => !r.checkOut).length
    const todayCount = room.records.filter(r => isToday(r.checkIn)).length
    const div = document.createElement('div')
    div.className = `room-item${room.id === selectedRoomId ? ' active' : ''}`
    div.innerHTML = `
      <div class="room-item-dot ${occupied ? 'room-item-dot--occupied' : 'room-item-dot--empty'}"></div>
      <div class="room-item-info">
        <div class="room-item-name">${escapeHtml(room.name)}</div>
        <div class="room-item-meta">${occupied ? `${activeCount} trong phòng` : `${todayCount} lượt hôm nay`}</div>
      </div>`
    div.addEventListener('click', () => selectRoom(room.id))
    dom.roomList.appendChild(div)
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Room Detail
// ═══════════════════════════════════════════════════════════
function renderRoomDetail() {
  const room = getSelectedRoom()
  if (!room) {
    dom.emptyState.style.display = ''
    dom.roomDetail.style.display = 'none'
    return
  }
  dom.emptyState.style.display = 'none'
  dom.roomDetail.style.display = ''

  dom.roomName.textContent = room.name
  const occupied = isRoomOccupied(room)
  dom.roomStatus.textContent = occupied ? 'Đang sử dụng' : 'Trống'
  dom.roomStatus.className = `room-badge ${occupied ? 'room-badge--occupied' : 'room-badge--empty'}`
  dom.btnCheckIn.disabled = occupied
  dom.btnCheckOut.disabled = !occupied
  dom.inputPrice.value = room.pricePerHour || ''

  const todayRecords = room.records.filter(r => isToday(r.checkIn))
  dom.statTodayEntries.textContent = todayRecords.length
  dom.statCurrentIn.textContent = room.records.filter(r => !r.checkOut).length
  dom.statTotalEntries.textContent = room.records.length

  let totalMs = 0
  todayRecords.forEach(r => {
    totalMs += getDurationMs(r.checkIn, r.checkOut)
  })
  dom.statTodayHours.textContent = formatDurationShort(totalMs)

  renderRecords(room)
}

function renderRecords(room) {
  let records = [...room.records]
  if (dom.filterDate.value === 'today') records = records.filter(r => isToday(r.checkIn))
  records.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))

  if (!records.length) {
    dom.recordsBody.innerHTML = ''
    dom.noRecords.style.display = ''
    return
  }
  dom.noRecords.style.display = 'none'
  dom.recordsBody.innerHTML = ''

  records.forEach((rec, i) => {
    const active = !rec.checkOut
    const hourlyCost = calculateCost(rec.checkIn, rec.checkOut, room.pricePerHour)
    const itemsCost = calculateItemsCost(rec.items)
    const totalCost = hourlyCost + itemsCost
    const itemCount = rec.items ? rec.items.reduce((sum, item) => sum + item.quantity, 0) : 0
    const recId = rec._id
    const tr = document.createElement('tr')
    tr.className = 'record-row-clickable'
    tr.dataset.roomId = room.id
    tr.dataset.recordId = recId
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px;">${records.length - i}</td>
      <td><span class="time-value">${formatTime(rec.checkIn)}</span><div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">${formatDate(rec.checkIn)}</div></td>
      <td><span class="time-value">${active ? '—' : formatTime(rec.checkOut)}</span>${!active ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">${formatDate(rec.checkOut)}</div>` : ''}</td>
      <td><span class="duration-value" data-live-duration="${active ? recId : ''}" ${active ? `data-checkin="${rec.checkIn}"` : ''}>${formatDuration(rec.checkIn, rec.checkOut)}</span></td>
      <td><button class="btn-record-items" data-room-id="${room.id}" data-record-id="${recId}">${
        itemCount > 0
          ? `<span class="record-items-badge">${itemCount}</span> <span class="record-items-cost">${formatMoney(itemsCost)}</span>`
          : '<span class="record-items-add">+ Thêm</span>'
      }</button></td>
      <td>
        <div class="record-cost-breakdown">
          <span class="money-value" data-live-cost="${active ? recId : ''}" ${active ? `data-checkin="${rec.checkIn}" data-price="${room.pricePerHour}" data-items-cost="${itemsCost}"` : ''}>${room.pricePerHour || itemsCost ? formatMoney(totalCost) : '—'}</span>
          ${room.pricePerHour && itemsCost ? `<span class="record-cost-detail" data-live-cost-detail="${active ? recId : ''}" ${active ? `data-checkin="${rec.checkIn}" data-price="${room.pricePerHour}" data-items-cost="${itemsCost}"` : ''}>${formatMoney(hourlyCost)} + ${formatMoney(itemsCost)}</span>` : ''}
        </div>
      </td>
      <td><span class="status-badge ${active ? 'status-badge--active' : 'status-badge--done'}"><span class="status-dot ${active ? 'status-dot--active' : ''}"></span>${active ? 'Trong phòng' : 'Đã ra'}</span></td>`
    dom.recordsBody.appendChild(tr)
  })

  // Bind row click for record detail
  dom.recordsBody.querySelectorAll('.record-row-clickable').forEach(tr => {
    tr.addEventListener('click', e => {
      // Don't open detail if clicking on the items button
      if (e.target.closest('.btn-record-items')) return
      openRecordDetailModal(tr.dataset.roomId, tr.dataset.recordId)
    })
  })

  // Bind record items buttons
  dom.recordsBody.querySelectorAll('.btn-record-items').forEach(btn => {
    btn.addEventListener('click', () => openRecordItemsModal(btn.dataset.roomId, btn.dataset.recordId))
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Rooms
// ═══════════════════════════════════════════════════════════
function renderAdminRooms() {
  if (!rooms.length) {
    dom.adminRoomsBody.innerHTML = ''
    dom.adminRoomsEmpty.style.display = ''
    return
  }
  dom.adminRoomsEmpty.style.display = 'none'
  dom.adminRoomsBody.innerHTML = ''
  rooms.forEach((room, i) => {
    const occupied = isRoomOccupied(room)
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i + 1}</td>
      <td><span class="time-value">${escapeHtml(room.name)}</span></td>
      <td>${getRoomTypeName(room.roomTypeId)}</td>
      <td>${room.pricePerHour ? formatMoney(room.pricePerHour) + '/h' : '—'}</td>
      <td><span class="status-badge ${occupied ? 'status-badge--active' : 'status-badge--done'}"><span class="status-dot ${occupied ? 'status-dot--active' : ''}"></span>${occupied ? 'Đang dùng' : 'Trống'}</span></td>
      <td>${room.records.length}</td>
      <td><div class="table-actions">
        <button class="btn-icon btn-edit" data-id="${room.id}" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon btn-icon--danger btn-del" data-id="${room.id}" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>`
    dom.adminRoomsBody.appendChild(tr)
  })

  dom.adminRoomsBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditRoomModal(btn.dataset.id))
  })
  dom.adminRoomsBody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Xóa phòng này và tất cả dữ liệu?')) deleteRoom(btn.dataset.id)
    })
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Room Types
// ═══════════════════════════════════════════════════════════
function renderAdminRoomTypes() {
  if (!roomTypes.length) {
    dom.adminTypesBody.innerHTML = ''
    dom.adminTypesEmpty.style.display = ''
    return
  }
  dom.adminTypesEmpty.style.display = 'none'
  dom.adminTypesBody.innerHTML = ''
  roomTypes.forEach((type, i) => {
    const count = rooms.filter(r => r.roomTypeId === type.id).length
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i + 1}</td>
      <td><span class="time-value">${escapeHtml(type.name)}</span></td>
      <td>${type.defaultPrice ? formatMoney(type.defaultPrice) + '/h' : '—'}</td>
      <td>${count} phòng</td>
      <td><div class="table-actions">
        <button class="btn-icon btn-edit-type" data-id="${type.id}" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon btn-icon--danger btn-del-type" data-id="${type.id}" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>`
    dom.adminTypesBody.appendChild(tr)
  })

  dom.adminTypesBody.querySelectorAll('.btn-edit-type').forEach(btn => {
    btn.addEventListener('click', () => openEditTypeModal(btn.dataset.id))
  })
  dom.adminTypesBody.querySelectorAll('.btn-del-type').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Xóa loại phòng này?')) deleteRoomType(btn.dataset.id)
    })
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Items
// ═══════════════════════════════════════════════════════════
function renderAdminItems() {
  if (!items.length) {
    dom.adminItemsBody.innerHTML = ''
    dom.adminItemsEmpty.style.display = ''
    return
  }
  dom.adminItemsEmpty.style.display = 'none'
  dom.adminItemsBody.innerHTML = ''
  items.forEach((item, i) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i + 1}</td>
      <td><span class="time-value">${escapeHtml(item.name)}</span></td>
      <td><span class="money-value">${formatMoney(item.price)}</span></td>
      <td><span class="count-badge ${item.stock <= 5 ? 'count-badge--danger' : ''}">${item.stock || 0}</span></td>
      <td><div class="table-actions">
        <button class="btn btn-xs btn-ghost btn-import-item" data-id="${item.id}">Nhập</button>
        <button class="btn-icon btn-edit-item" data-id="${item.id}" title="Sửa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon btn-icon--danger btn-del-item" data-id="${item.id}" title="Xóa"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>`
    dom.adminItemsBody.appendChild(tr)
  })

  dom.adminItemsBody.querySelectorAll('.btn-import-item').forEach(btn => {
    btn.addEventListener('click', () => openImportModal(btn.dataset.id))
  })
  dom.adminItemsBody.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => openEditItemModal(btn.dataset.id))
  })
  dom.adminItemsBody.querySelectorAll('.btn-del-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Xóa sản phẩm này?')) deleteItem(btn.dataset.id)
    })
  })
}

function renderAdminImports() {
  if (!importHistory.length) {
    dom.adminImportsBody.innerHTML = ''
    dom.adminImportsEmpty.style.display = ''
    return
  }
  dom.adminImportsEmpty.style.display = 'none'
  dom.adminImportsBody.innerHTML = ''
  importHistory.forEach(h => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="font-size:12px;color:var(--text-tertiary)">${formatDate(h.importDate)} ${formatTime(h.importDate)}</td>
      <td><span class="time-value">${escapeHtml(h.itemName)}</span></td>
      <td><span class="count-badge">${h.quantity}</span></td>
      <td><span class="money-value">${formatMoney(h.importPrice)}</span></td>
      <td style="font-size:12px;color:var(--text-tertiary)">${h.note ? escapeHtml(h.note) : '—'}</td>`
    dom.adminImportsBody.appendChild(tr)
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Pricing
// ═══════════════════════════════════════════════════════════
function renderAdminPricing() {
  if (!roomTypes.length) {
    dom.pricingTypesList.innerHTML = ''
    dom.pricingNoTypes.style.display = ''
    return
  }
  dom.pricingNoTypes.style.display = 'none'
  dom.pricingTypesList.innerHTML = ''
  roomTypes.forEach(type => {
    const count = rooms.filter(r => r.roomTypeId === type.id).length
    const div = document.createElement('div')
    div.className = 'pricing-type-row'
    div.innerHTML = `
      <div class="pricing-type-name">${escapeHtml(type.name)}</div>
      <div class="pricing-type-count">${count} phòng</div>
      <input type="number" class="pricing-type-input" data-type-id="${type.id}" value="${type.defaultPrice || ''}" placeholder="0" min="0" step="1000" />
      <span style="font-size:12px;color:var(--text-tertiary);margin-right:8px">₫/h</span>
      <button class="btn btn-sm btn-ghost btn-apply-type-price" data-type-id="${type.id}">Áp dụng</button>`
    dom.pricingTypesList.appendChild(div)
  })

  // Bind
  dom.pricingTypesList.querySelectorAll('.btn-apply-type-price').forEach(btn => {
    btn.addEventListener('click', () => {
      const typeId = btn.dataset.typeId
      const input = dom.pricingTypesList.querySelector(`input[data-type-id="${typeId}"]`)
      const price = parseInt(input.value) || 0
      applyTypePrice(typeId, price)
    })
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Stats
// ═══════════════════════════════════════════════════════════

function getStatsDateRange() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  if (statsPreset === 'today') {
    return { start: todayStart, end: todayEnd, label: 'Doanh thu hôm nay' }
  } else if (statsPreset === 'week') {
    const weekStart = new Date(todayEnd.getTime() - 7 * 86400000)
    return { start: weekStart, end: todayEnd, label: 'Doanh thu 7 ngày qua' }
  } else if (statsPreset === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: monthStart, end: todayEnd, label: 'Doanh thu tháng này' }
  } else if (statsPreset === 'custom') {
    const s = dom.statsDateStart.value
    const e = dom.statsDateEnd.value
    const start = s ? new Date(s) : new Date(0)
    const end = e ? new Date(new Date(e).getTime() + 86400000) : todayEnd
    const label = s && e ? `Doanh thu ${formatDate(s)} — ${formatDate(e)}` : 'Doanh thu tùy chọn'
    return { start, end, label }
  } else {
    // "all" preset: find earliest record to avoid generating dates from 1970
    let earliest = todayStart
    rooms.forEach(room => {
      room.records.forEach(rec => {
        if (rec.checkOut) {
          const d = new Date(rec.checkOut)
          if (d < earliest) earliest = d
        }
      })
    })
    const start = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate())
    return { start, end: todayEnd, label: 'Tổng doanh thu' }
  }
}

function collectFilteredRecords(start, end) {
  const allRecords = []
  rooms.forEach(room => {
    room.records.forEach(rec => {
      if (!rec.checkOut) return
      const coDate = new Date(rec.checkOut)
      if (coDate >= start && coDate < end) {
        const hourlyCost = calculateCost(rec.checkIn, rec.checkOut, room.pricePerHour)
        const itemsCost = calculateItemsCost(rec.items)
        allRecords.push({
          room,
          rec,
          hourlyCost,
          itemsCost,
          totalCost: hourlyCost + itemsCost,
          durationMs: getDurationMs(rec.checkIn, rec.checkOut),
          checkOutDate: coDate
        })
      }
    })
  })
  return allRecords
}

function buildDailyData(records, start, end) {
  const dayMap = {}
  // Helper: format date as local YYYY-MM-DD (avoids UTC shift from toISOString)
  const toLocalDateKey = d => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  // Cap range to max 365 days to prevent huge loops
  const maxRange = 365 * 86400000
  let effectiveStart = start
  if (end - start > maxRange) {
    effectiveStart = new Date(end.getTime() - maxRange)
  }
  // Generate all dates in range
  const cur = new Date(effectiveStart)
  while (cur < end) {
    const key = toLocalDateKey(cur)
    dayMap[key] = { hourly: 0, items: 0 }
    cur.setDate(cur.getDate() + 1)
  }
  records.forEach(r => {
    const key = toLocalDateKey(r.checkOutDate)
    if (dayMap[key]) {
      dayMap[key].hourly += r.hourlyCost
      dayMap[key].items += r.itemsCost
    }
  })
  const labels = Object.keys(dayMap).map(k => {
    const parts = k.split('-')
    return `${parts[2]}/${parts[1]}`
  })
  return {
    labels,
    hourly: Object.values(dayMap).map(v => v.hourly),
    items: Object.values(dayMap).map(v => v.items)
  }
}

function renderChart_Daily(dailyData) {
  if (chartDailyInstance) {
    chartDailyInstance.data.labels = dailyData.labels
    chartDailyInstance.data.datasets[0].data = dailyData.hourly
    chartDailyInstance.data.datasets[1].data = dailyData.items
    chartDailyInstance.update('none')
    return
  }
  const ctx = dom.chartRevenueDaily.getContext('2d')
  chartDailyInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dailyData.labels,
      datasets: [
        {
          label: 'Tiền giờ',
          data: dailyData.hourly,
          backgroundColor: 'rgba(99,102,241,0.7)',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Tiền sản phẩm',
          data: dailyData.items,
          backgroundColor: 'rgba(245,158,11,0.7)',
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: document.body.classList.contains('light-theme') ? '#334155' : '#8b8b9e',
            font: { size: 11, family: 'Inter' },
            boxWidth: 12,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#1a1a24',
          titleColor: document.body.classList.contains('light-theme') ? '#1e293b' : '#f0f0f5',
          bodyColor: document.body.classList.contains('light-theme') ? '#475569' : '#8b8b9e',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: document.body.classList.contains('light-theme')
              ? 'rgba(0,0,0,0.05)'
              : 'rgba(255,255,255,0.04)'
          },
          ticks: {
            color: document.body.classList.contains('light-theme') ? '#475569' : '#5a5a6e',
            font: { size: 10, family: 'Inter' }
          }
        },
        y: {
          grid: {
            color: document.body.classList.contains('light-theme')
              ? 'rgba(0,0,0,0.05)'
              : 'rgba(255,255,255,0.04)'
          },
          ticks: {
            color: document.body.classList.contains('light-theme') ? '#475569' : '#5a5a6e',
            font: { size: 10, family: 'Inter' },
            callback: v => (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? v / 1000 + 'K' : v)
          }
        }
      }
    }
  })
}

function renderChart_Room(roomStats) {
  const top = roomStats.slice(0, 8)
  const colors = [
    'rgba(99,102,241,0.8)',
    'rgba(34,197,94,0.8)',
    'rgba(245,158,11,0.8)',
    'rgba(239,68,68,0.8)',
    'rgba(168,85,247,0.8)',
    'rgba(6,182,212,0.8)',
    'rgba(244,114,182,0.8)',
    'rgba(132,204,22,0.8)'
  ]
  if (chartRoomInstance) {
    chartRoomInstance.data.labels = top.map(rs => rs.room.name)
    chartRoomInstance.data.datasets[0].data = top.map(rs => rs.totalRevenue)
    chartRoomInstance.data.datasets[0].backgroundColor = colors.slice(0, top.length)
    chartRoomInstance.update('none')
    return
  }
  const ctx = dom.chartRevenueRoom.getContext('2d')
  chartRoomInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top.map(rs => rs.room.name),
      datasets: [
        {
          data: top.map(rs => rs.totalRevenue),
          backgroundColor: colors.slice(0, top.length),
          borderColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#111118',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: document.body.classList.contains('light-theme') ? '#334155' : '#8b8b9e',
            font: { size: 11, family: 'Inter' },
            boxWidth: 12,
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#1a1a24',
          titleColor: document.body.classList.contains('light-theme') ? '#1e293b' : '#f0f0f5',
          bodyColor: document.body.classList.contains('light-theme') ? '#475569' : '#8b8b9e',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}`
          }
        }
      }
    }
  })
}

function renderAdminStats() {
  const { start, end, label } = getStatsDateRange()
  const records = collectFilteredRecords(start, end)

  let totalRevenue = 0,
    totalHourly = 0,
    totalItems = 0,
    totalUsage = records.length
  records.forEach(r => {
    totalRevenue += r.totalCost
    totalHourly += r.hourlyCost
    totalItems += r.itemsCost
  })

  dom.statsPeriodLabel.textContent = label
  dom.statsRevenuePeriod.textContent = formatMoney(totalRevenue)
  dom.statsRevenueHourly.textContent = formatMoney(totalHourly)
  dom.statsRevenueItems.textContent = formatMoney(totalItems)
  dom.statsTotalUsage.textContent = totalUsage

  // Room stats
  const roomMap = {}
  records.forEach(r => {
    if (!roomMap[r.room.id])
      roomMap[r.room.id] = {
        room: r.room,
        totalRevenue: 0,
        totalHourly: 0,
        totalItems: 0,
        durationMs: 0,
        usage: 0
      }
    const rs = roomMap[r.room.id]
    rs.totalRevenue += r.totalCost
    rs.totalHourly += r.hourlyCost
    rs.totalItems += r.itemsCost
    rs.durationMs += r.durationMs
    rs.usage++
  })
  const roomStats = Object.values(roomMap).sort((a, b) => b.totalRevenue - a.totalRevenue)

  dom.statsRoomBody.innerHTML = ''
  roomStats.forEach((rs, i) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i + 1}</td>
      <td><span class="time-value">${escapeHtml(rs.room.name)}</span></td>
      <td>${getRoomTypeName(rs.room.roomTypeId)}</td>
      <td>${rs.usage}</td>
      <td><span class="duration-value">${formatDurationShort(rs.durationMs)}</span></td>
      <td><span class="money-value">${formatMoney(rs.totalRevenue)}</span></td>
      <td><button class="btn btn-sm btn-ghost btn-stats-room-detail" data-room-id="${rs.room.id}">Chi tiết</button></td>`
    dom.statsRoomBody.appendChild(tr)
  })

  // Bind detail buttons
  $$('.btn-stats-room-detail').forEach(btn => {
    btn.addEventListener('click', () => openRoomStatsDetail(btn.dataset.roomId, start, end))
  })

  // Charts
  const dailyData = buildDailyData(records, start, end)
  renderChart_Daily(dailyData)
  renderChart_Room(roomStats)
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Rooms
// ═══════════════════════════════════════════════════════════
function openRoomStatsDetail(roomId, start, end) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) return

  const filteredRecords = room.records
    .filter(rec => {
      if (!rec.checkOut) return false
      const d = new Date(rec.checkOut)
      return d >= start && d < end
    })
    .sort((a, b) => new Date(b.checkOut) - new Date(a.checkOut))

  dom.modalTitle.textContent = `Lịch sử: ${room.name}`
  document.querySelector('.modal').classList.add('modal--wide')

  let rowsHtml = ''
  if (filteredRecords.length === 0) {
    rowsHtml =
      '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-tertiary)">Không có dữ liệu trong kỳ này</td></tr>'
  } else {
    filteredRecords.forEach((rec, i) => {
      const hourly = calculateCost(rec.checkIn, rec.checkOut, room.pricePerHour)
      const items = calculateItemsCost(rec.items)
      rowsHtml += `
        <tr class="record-row-clickable" data-room-id="${room.id}" data-record-id="${rec._id}">
          <td style="color:var(--text-tertiary);font-size:12px">${filteredRecords.length - i}</td>
          <td>
            <div style="font-size:13px">${formatDate(rec.checkIn)}</div>
            <div style="font-size:11px;color:var(--text-tertiary)">${formatTime(rec.checkIn)} - ${formatTime(rec.checkOut)}</div>
          </td>
          <td><span class="duration-value">${formatDuration(rec.checkIn, rec.checkOut)}</span></td>
          <td class="money-value">${formatMoney(hourly + items)}</td>
          <td><button class="btn btn-sm btn-ghost">Xem</button></td>
        </tr>`
    })
  }

  dom.modalBody.innerHTML = `
    <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th><th>Thời gian</th><th>Sử dụng</th><th>Thành tiền</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>`

  // Bind clicks
  dom.modalBody.querySelectorAll('.record-row-clickable').forEach(tr => {
    tr.addEventListener('click', () => {
      openRecordDetailModal(tr.dataset.roomId, tr.dataset.recordId)
    })
  })

  dom.modalConfirm.textContent = 'Đóng'
  dom.modalCancel.style.display = 'none'
  openModal()
}
function selectRoom(id) {
  selectedRoomId = id
  renderRoomList()
  renderRoomDetail()
}

async function addRoom(name, pricePerHour, roomTypeId) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room', {
    name: name.trim(),
    pricePerHour: parseInt(pricePerHour) || 0,
    roomTypeId: roomTypeId || null
  })
  await loadData()
  renderRoomList()
  renderAdminRooms()
  if (!selectedRoomId && rooms.length) selectRoom(rooms[0].id)
  showToast('Đã thêm phòng', 'success')
}

async function editRoom(id, name, pricePerHour, roomTypeId) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room', {
    id,
    name: name.trim(),
    pricePerHour: parseInt(pricePerHour) || 0,
    roomTypeId: roomTypeId || null
  })
  await loadData()
  renderRoomList()
  renderRoomDetail()
  renderAdminRooms()
  showToast('Đã cập nhật', 'success')
}

async function deleteRoom(id) {
  await window.electronAPI.invoke('db:delete-room', id)
  if (selectedRoomId === id) selectedRoomId = null
  await loadData()
  if (!selectedRoomId && rooms.length) selectedRoomId = rooms[0].id
  renderRoomList()
  renderRoomDetail()
  renderAdminRooms()
  showToast('Đã xóa', 'danger')
}

// Global price and price updates continue to use DB handlers
async function updateRoomPrice(id, price) {
  await window.electronAPI.invoke('db:save-room', {
    id,
    pricePerHour: parseInt(price) || 0,
    name: rooms.find(r => r.id === id).name
  })
  await loadData()
  const room = rooms.find(r => r.id === id)
  if (room) renderRecords(room)
}

async function checkIn(id) {
  await window.electronAPI.invoke('db:check-in', id)
  await loadData()
  renderRoomList()
  renderRoomDetail()
  showToast('Check-in thành công', 'success')
}

async function checkOut(id) {
  await window.electronAPI.invoke('db:check-out', id)
  await loadData()
  renderRoomList()
  renderRoomDetail()
  showToast('Check-out thành công', 'warning')
}

async function deleteRecord(roomId, recordId) {
  await window.electronAPI.invoke('db:delete-record', { roomId, recordId })
  await loadData()
  renderRoomList()
  renderRoomDetail()
  showToast('Đã xóa lượt', 'danger')
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Room Types
// ═══════════════════════════════════════════════════════════
async function addRoomType(name, defaultPrice) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room-type', {
    name: name.trim(),
    defaultPrice: parseInt(defaultPrice) || 0
  })
  await loadData()
  renderAdminRoomTypes()
  renderAdminPricing()
  showToast('Đã thêm loại phòng', 'success')
}

async function editRoomType(id, name, defaultPrice) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room-type', {
    id,
    name: name.trim(),
    defaultPrice: parseInt(defaultPrice) || 0
  })
  await loadData()
  renderAdminRoomTypes()
  renderAdminPricing()
  showToast('Đã cập nhật loại phòng', 'success')
}

async function deleteRoomType(id) {
  const type = roomTypes.find(t => t.id === id)
  if (!type) return
  await window.electronAPI.invoke('db:delete-room-type', id)
  await loadData()
  renderAdminRoomTypes()
  renderAdminPricing()
  renderAdminRooms()
  showToast('Đã xóa loại phòng', 'danger')
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Pricing
// ═══════════════════════════════════════════════════════════
async function applyGlobalPrice(price) {
  await window.electronAPI.invoke('db:apply-global-price', parseInt(price) || 0)
  await loadData()
  renderRoomList()
  renderRoomDetail()
  renderAdminRooms()
  showToast('Đã áp dụng giá chung', 'success')
}

async function applyTypePrice(typeId, price) {
  const type = roomTypes.find(t => t.id === typeId)
  if (!type) return
  await window.electronAPI.invoke('db:apply-type-price', { typeId, price: parseInt(price) || 0 })
  await loadData()
  renderAdminPricing()
  renderAdminRooms()
  showToast(`Đã áp dụng ${formatMoney(parseInt(price) || 0)}/h cho loại "${type.name}"`, 'success')
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Items (Admin CRUD)
// ═══════════════════════════════════════════════════════════
async function addItem(name, price, stock) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-item', {
    name: name.trim(),
    price: parseInt(price) || 0,
    stock: parseInt(stock) || 0
  })
  await loadData()
  renderAdminItems()
  showToast('Đã thêm sản phẩm', 'success')
}

async function editItem(id, name, price, stock) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-item', {
    id,
    name: name.trim(),
    price: parseInt(price) || 0,
    stock: parseInt(stock) || 0
  })
  await loadData()
  renderAdminItems()
  showToast('Đã cập nhật sản phẩm', 'success')
}

async function deleteItem(id) {
  await window.electronAPI.invoke('db:delete-item', id)
  await loadData()
  renderAdminItems()
  showToast('Đã xóa sản phẩm', 'danger')
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Record Items
// ═══════════════════════════════════════════════════════════
async function addRecordItem(roomId, recordId, itemId, name, price, quantity) {
  await window.electronAPI.invoke('db:add-record-item', { roomId, recordId, itemId, name, price, quantity })
  await loadData()
  renderRoomDetail()
}

async function removeRecordItem(roomId, recordId, recordItemId) {
  await window.electronAPI.invoke('db:remove-record-item', { roomId, recordId, recordItemId })
  await loadData()
  renderRoomDetail()
}

async function updateRecordTimes(roomId, recordId, checkIn, checkOut) {
  await window.electronAPI.invoke('db:update-record-times', { roomId, recordId, checkIn, checkOut })
  await loadData()
  renderRoomDetail()
}

// ═══════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════
function buildRoomTypeOptions(selectedId) {
  let opts = '<option value="">-- Không chọn --</option>'
  roomTypes.forEach(t => {
    opts += `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${escapeHtml(t.name)} (${formatMoney(t.defaultPrice)}/h)</option>`
  })
  return opts
}

function openAddRoomModal() {
  modalMode = 'add-room'
  editingId = null
  dom.modalTitle.textContent = 'Thêm phòng mới'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên phòng</label><input type="text" id="m-name" class="form-input" placeholder="VD: Phòng 101" autofocus /></div>
    <div class="form-group"><label class="form-label">Loại phòng</label><select id="m-type" class="form-input">${buildRoomTypeOptions(null)}</select></div>
    <div class="form-group"><label class="form-label">Giá mỗi giờ (₫)</label><input type="number" id="m-price" class="form-input" placeholder="VD: 50000" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Thêm phòng'
  openModal()
  // Auto-fill price when selecting type
  setTimeout(() => {
    const typeSelect = $('#m-type')
    if (typeSelect)
      typeSelect.addEventListener('change', () => {
        const t = roomTypes.find(t => t.id === typeSelect.value)
        if (t) $('#m-price').value = t.defaultPrice || ''
      })
  }, 50)
}

function openEditRoomModal(id) {
  const room = rooms.find(r => r.id === id)
  if (!room) return
  modalMode = 'edit-room'
  editingId = id
  dom.modalTitle.textContent = 'Sửa phòng'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên phòng</label><input type="text" id="m-name" class="form-input" value="${escapeHtml(room.name)}" /></div>
    <div class="form-group"><label class="form-label">Loại phòng</label><select id="m-type" class="form-input">${buildRoomTypeOptions(room.roomTypeId)}</select></div>
    <div class="form-group"><label class="form-label">Giá mỗi giờ (₫)</label><input type="number" id="m-price" class="form-input" value="${room.pricePerHour || ''}" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Lưu'
  openModal()
}

function openAddTypeModal() {
  modalMode = 'add-type'
  editingId = null
  dom.modalTitle.textContent = 'Thêm loại phòng'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên loại phòng</label><input type="text" id="m-tname" class="form-input" placeholder="VD: VIP, Thường, Phòng họp..." autofocus /></div>
    <div class="form-group"><label class="form-label">Giá mặc định/giờ (₫)</label><input type="number" id="m-tprice" class="form-input" placeholder="VD: 50000" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Thêm'
  openModal()
}

function openEditTypeModal(id) {
  const type = roomTypes.find(t => t.id === id)
  if (!type) return
  modalMode = 'edit-type'
  editingId = id
  dom.modalTitle.textContent = 'Sửa loại phòng'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên loại phòng</label><input type="text" id="m-tname" class="form-input" value="${escapeHtml(type.name)}" /></div>
    <div class="form-group"><label class="form-label">Giá mặc định/giờ (₫)</label><input type="number" id="m-tprice" class="form-input" value="${type.defaultPrice || ''}" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Lưu'
  openModal()
}
function openAddItemModal() {
  modalMode = 'add-item'
  editingId = null
  dom.modalTitle.textContent = 'Thêm sản phẩm'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên sản phẩm</label><input type="text" id="m-iname" class="form-input" placeholder="VD: Bia Tiger, Bim bim..." autofocus /></div>
    <div class="form-group"><label class="form-label">Giá (₫)</label><input type="number" id="m-iprice" class="form-input" placeholder="VD: 15000" min="0" step="1000" /></div>
    <div class="form-group"><label class="form-label">Số lượng tồn kho</label><input type="number" id="m-istock" class="form-input" placeholder="VD: 100" min="0" /></div>`
  dom.modalConfirm.textContent = 'Thêm'
  openModal()
}

function openEditItemModal(id) {
  const item = items.find(i => i.id === id)
  if (!item) return
  modalMode = 'edit-item'
  editingId = id
  dom.modalTitle.textContent = 'Sửa sản phẩm'
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên sản phẩm</label><input type="text" id="m-iname" class="form-input" value="${escapeHtml(item.name)}" /></div>
    <div class="form-group"><label class="form-label">Giá (₫)</label><input type="number" id="m-iprice" class="form-input" value="${item.price || ''}" min="0" step="1000" /></div>
    <div class="form-group"><label class="form-label">Số lượng tồn kho</label><input type="number" id="m-istock" class="form-input" value="${item.stock || 0}" min="0" /></div>`
  dom.modalConfirm.textContent = 'Lưu'
  openModal()
}

function openRecordDetailModal(roomId, recordId) {
  modalMode = 'record-detail'
  editingId = recordId
  editingRoomId = roomId
  const room = rooms.find(r => r.id === roomId)
  if (!room) return
  const record = room.records.find(r => r._id === recordId)
  if (!record) return

  const active = !record.checkOut
  const hourlyCost = calculateCost(record.checkIn, record.checkOut, room.pricePerHour)
  const itemsCost = calculateItemsCost(record.items)
  const totalCost = hourlyCost + itemsCost

  // Format date and time separately for inputs
  const formatDateInput = d => {
    if (!d) return ''
    const dt = new Date(d)
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  }
  const formatTimeInput = d => {
    if (!d) return ''
    const dt = new Date(d)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  dom.modalTitle.textContent = `Chi tiết lượt #${room.records.indexOf(record) + 1}`

  // Add wide class to modal
  document.querySelector('.modal').classList.add('modal--wide')

  // Items list
  let itemsHtml = ''
  if (record.items && record.items.length) {
    record.items.forEach(ri => {
      itemsHtml += `
        <div class="record-item-row">
          <span class="record-item-name">${escapeHtml(ri.name)}</span>
          <span class="record-item-price">${formatMoney(ri.price)}</span>
          <span class="record-item-qty">× ${ri.quantity}</span>
          <span class="record-item-subtotal">${formatMoney(ri.price * ri.quantity)}</span>
        </div>`
    })
  } else {
    itemsHtml = '<div class="record-items-empty">Chưa có sản phẩm nào</div>'
  }

  dom.modalBody.innerHTML = `
    <div class="record-detail-panel">
      <div class="record-detail-times">
        <div class="record-detail-time-row">
          <span class="rd-label">Giờ vào</span>
          <input type="date" id="m-rd-checkin-date" class="form-input" value="${formatDateInput(record.checkIn)}" />
          <input type="time" id="m-rd-checkin-time" class="form-input" value="${formatTimeInput(record.checkIn)}" step="60" />
        </div>
        <div class="record-detail-time-row">
          <span class="rd-label">Giờ ra</span>
          <input type="date" id="m-rd-checkout-date" class="form-input" value="${formatDateInput(record.checkOut)}" />
          <input type="time" id="m-rd-checkout-time" class="form-input" value="${formatTimeInput(record.checkOut)}" step="60" />
        </div>
        <div class="record-detail-times-actions">
          <button id="m-rd-save-times" class="btn btn-sm btn-primary">Lưu thay đổi giờ</button>
        </div>
      </div>

      <div class="record-detail-divider"></div>

      <div class="record-detail-costs">
        <div class="record-detail-cost-row">
          <span class="record-detail-cost-label">Thời gian sử dụng</span>
          <span class="record-detail-cost-value">${formatDuration(record.checkIn, record.checkOut)}</span>
        </div>
        <div class="record-detail-cost-row">
          <span class="record-detail-cost-label">Tiền giờ <span style="color:var(--text-tertiary);font-weight:400">(${formatMoney(room.pricePerHour)}/h)</span></span>
          <span class="record-detail-cost-value money-value">${formatMoney(hourlyCost)}</span>
        </div>
        <div class="record-detail-cost-row">
          <span class="record-detail-cost-label">Tiền sản phẩm</span>
          <span class="record-detail-cost-value money-value">${formatMoney(itemsCost)}</span>
        </div>
        <div class="record-detail-cost-row record-detail-cost-total">
          <span class="record-detail-cost-label">Tổng cộng</span>
          <span class="record-detail-cost-value">${formatMoney(totalCost)}</span>
        </div>
      </div>

      <div class="record-detail-divider"></div>

      <div class="record-detail-items-section">
        <div class="record-detail-section-title">Sản phẩm đã dùng</div>
        <div class="record-items-list">${itemsHtml}</div>
      </div>

      <div class="record-detail-actions">
        ${!active ? `<button id="m-rd-reopen" class="btn btn-sm btn-reopen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Mở lại (tiếp tục tính giờ)</button>` : `<button id="m-rd-stop" class="btn btn-sm btn-stop-charge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Dừng tính tiền</button>`}
        <button id="m-rd-delete" class="btn btn-sm btn-danger-outline">Xóa lượt này</button>
      </div>
    </div>`

  dom.modalCancel.style.display = 'none'
  dom.modalConfirm.textContent = 'Đóng'
  dom.modalOverlay.style.display = ''

  // Bind events
  setTimeout(() => {
    const saveBtn = $('#m-rd-save-times')
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const ciDate = $('#m-rd-checkin-date').value
        const ciTime = $('#m-rd-checkin-time').value
        const coDate = $('#m-rd-checkout-date').value
        const coTime = $('#m-rd-checkout-time').value

        if (!ciDate || !ciTime) {
          showToast('Giờ vào không được trống', 'warning')
          return
        }

        const checkInVal = `${ciDate}T${ciTime}`
        let checkOutVal = null
        if (coDate && coTime) {
          checkOutVal = `${coDate}T${coTime}`
          if (new Date(checkOutVal) <= new Date(checkInVal)) {
            showToast('Giờ ra phải sau giờ vào', 'warning')
            return
          }
        }

        await updateRecordTimes(roomId, recordId, checkInVal, checkOutVal)
        showToast('Đã cập nhật giờ', 'success')
        openRecordDetailModal(roomId, recordId) // refresh
      })
    }

    const reopenBtn = $('#m-rd-reopen')
    if (reopenBtn) {
      reopenBtn.addEventListener('click', async () => {
        const currentRoom = rooms.find(r => r.id === roomId)
        const hasActive = currentRoom && currentRoom.records.some(r => !r.checkOut)
        if (hasActive) {
          showToast('Phòng đang có lượt sử dụng khác chưa kết thúc. Hãy check-out trước.', 'warning')
          return
        }
        if (confirm('Mở lại lượt này? Giờ ra sẽ bị xóa và bắt đầu tính tiếp.')) {
          await updateRecordTimes(roomId, recordId, record.checkIn, null)
          showToast('Đã mở lại — đang tính giờ tiếp', 'success')
          openRecordDetailModal(roomId, recordId)
        }
      })
    }

    const stopBtn = $('#m-rd-stop')
    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        await checkOut(roomId)
        showToast('Đã dừng tính tiền', 'warning')
        openRecordDetailModal(roomId, recordId)
      })
    }

    const deleteBtn = $('#m-rd-delete')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Xóa lượt vào/ra này?')) {
          await deleteRecord(roomId, recordId)
          showToast('Đã xóa lượt', 'danger')
          closeModal()
        }
      })
    }
  }, 50)
}

function openImportModal(itemId) {
  modalMode = 'import-item'
  editingId = itemId
  const item = items.find(i => i.id === itemId)
  if (!item) return

  dom.modalTitle.textContent = `Nhập hàng: ${item.name}`
  document.querySelector('.modal').classList.add('modal--wide')
  dom.modalBody.innerHTML = `
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">Số lượng nhập</label>
      <input type="number" id="m-import-qty" class="form-input" min="1" value="10" />
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">Giá nhập mỗi đơn vị (₫)</label>
      <input type="number" id="m-import-price" class="form-input" value="0" />
    </div>
    <div class="form-group">
      <label class="form-label">Ghi chú (tùy chọn)</label>
      <input type="text" id="m-import-note" class="form-input" placeholder="Ví dụ: Nhập từ kho tổng" />
    </div>`

  dom.modalCancel.style.display = ''
  dom.modalConfirm.textContent = 'Nhập hàng'
  openModal()
}

async function handleImportSave() {
  const qty = parseInt($('#m-import-qty').value) || 0
  const price = parseInt($('#m-import-price').value) || 0
  const note = $('#m-import-note').value.trim()

  if (qty <= 0) {
    showToast('Số lượng phải lớn hơn 0', 'warning')
    return
  }

  await window.electronAPI.invoke('db:import-items', {
    itemId: editingId,
    quantity: qty,
    importPrice: price,
    note
  })

  await loadData()
  renderAdminItems()
  renderAdminImports()
  closeModal()
  showToast('Đã nhập hàng thành công', 'success')
}

function openRecordItemsModal(roomId, recordId) {
  modalMode = 'record-items'
  editingId = recordId
  editingRoomId = roomId
  document.querySelector('.modal').classList.add('modal--wide')
  const room = rooms.find(r => r.id === roomId)
  if (!room) return
  const record = room.records.find(r => r._id === recordId)
  if (!record) return

  dom.modalTitle.textContent = 'Sản phẩm sử dụng'

  // Build items list
  let itemsHtml = ''
  if (record.items && record.items.length) {
    record.items.forEach(ri => {
      itemsHtml += `
        <div class="record-item-row">
          <span class="record-item-name">${escapeHtml(ri.name)}</span>
          <span class="record-item-price">${formatMoney(ri.price)}</span>
          <span class="record-item-qty-wrap">×<input type="number" class="record-item-qty-input" data-ri-id="${ri._id}" data-item-id="${ri.itemId}" data-price="${ri.price}" value="${ri.quantity}" min="1" /></span>
          <span class="record-item-subtotal" data-subtotal-id="${ri._id}">${formatMoney(ri.price * ri.quantity)}</span>
          <button class="btn-icon btn-icon--danger btn-remove-ri" data-ri-id="${ri._id}" title="Xóa" style="width:24px;height:24px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`
    })
  } else {
    itemsHtml = '<div class="record-items-empty">Chưa có sản phẩm nào</div>'
  }

  const totalItemsCost = calculateItemsCost(record.items)

  // Build add item form
  let selectOptions = '<option value="">— Chọn sản phẩm —</option>'
  items.forEach(item => {
    const stockStr =
      item.stock <= 5 ? `<span style="color:var(--danger)">Hết hàng</span>` : `Tồn: ${item.stock}`
    selectOptions += `<option value="${item.id}">${escapeHtml(item.name)} (Tồn: ${item.stock})</option>`
  })

  dom.modalBody.innerHTML = `
    <div class="record-items-panel">
      <div class="record-items-list">${itemsHtml}</div>
      ${totalItemsCost ? `<div class="record-items-total">Tổng sản phẩm: <span class="total-amount">${formatMoney(totalItemsCost)}</span></div>` : ''}
      <div class="record-items-add-form">
        <select id="m-select-item" class="form-input">${selectOptions}</select>
        <input type="number" id="m-item-qty" class="form-input" value="1" min="1" style="width:60px;text-align:center;" />
        <button id="m-btn-add-ri" class="btn btn-sm btn-primary">Thêm</button>
      </div>
    </div>`

  dom.modalCancel.style.display = 'none'
  dom.modalConfirm.textContent = 'Đóng'
  dom.modalOverlay.style.display = ''

  // Bind events for record items modal
  setTimeout(() => {
    const addBtn = $('#m-btn-add-ri')
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const select = $('#m-select-item')
        const qty = parseInt($('#m-item-qty').value) || 1
        const itemId = select.value
        if (!itemId) {
          showToast('Vui lòng chọn sản phẩm', 'warning')
          return
        }
        const item = items.find(i => i.id === itemId)
        if (item.stock < qty) {
          showToast(`Không đủ tồn kho (Còn ${item.stock})`, 'danger')
          return
        }
        await addRecordItem(roomId, recordId, itemId, item.name, item.price, qty)
        showToast(`Đã thêm ${item.name}`, 'success')
        openRecordItemsModal(roomId, recordId) // refresh
      })
    }

    document.querySelectorAll('.btn-remove-ri').forEach(btn => {
      btn.addEventListener('click', async () => {
        await removeRecordItem(roomId, recordId, btn.dataset.riId)
        showToast('Đã xóa sản phẩm', 'danger')
        openRecordItemsModal(roomId, recordId)
      })
    })

    // Bind quantity edit
    let qtyDebounce = null
    document.querySelectorAll('.record-item-qty-input').forEach(input => {
      input.addEventListener('input', () => {
        const price = parseFloat(input.dataset.price) || 0
        const qty = parseInt(input.value) || 1
        const subtotalEl = document.querySelector(`[data-subtotal-id="${input.dataset.riId}"]`)
        if (subtotalEl) subtotalEl.textContent = formatMoney(price * qty)
      })
      input.addEventListener('change', () => {
        clearTimeout(qtyDebounce)
        const riId = input.dataset.riId
        const qty = Math.max(1, parseInt(input.value) || 1)
        input.value = qty
        qtyDebounce = setTimeout(async () => {
          await window.electronAPI.invoke('db:update-record-item', {
            roomId,
            recordId,
            recordItemId: riId,
            quantity: qty
          })
          await loadData()
          renderRoomDetail()
          // Update total in modal
          const room2 = rooms.find(r => r.id === roomId)
          const record2 = room2 && room2.records.find(r => r._id === recordId)
          const totalEl = document.querySelector('.record-items-total .total-amount')
          if (totalEl && record2) totalEl.textContent = formatMoney(calculateItemsCost(record2.items))
          showToast('Đã cập nhật số lượng', 'success')
        }, 300)
      })
    })
  }, 50)
}
function openModal() {
  dom.modalCancel.style.display = ''
  dom.modalConfirm.style.display = ''
  dom.modalOverlay.style.display = ''
  setTimeout(() => {
    const first = dom.modalBody.querySelector('input')
    if (first) first.focus()
  }, 100)
}

function closeModal() {
  dom.modalOverlay.style.display = 'none'
  dom.modalCancel.style.display = ''
  dom.modalConfirm.style.display = ''
  document.querySelector('.modal').classList.remove('modal--wide')
  modalMode = null
  editingId = null
  editingRoomId = null
}

function submitModal() {
  if (modalMode === 'add-room') {
    addRoom($('#m-name')?.value, $('#m-price')?.value, $('#m-type')?.value)
  } else if (modalMode === 'edit-room') {
    editRoom(editingId, $('#m-name')?.value, $('#m-price')?.value, $('#m-type')?.value)
  } else if (modalMode === 'add-type') {
    addRoomType($('#m-tname')?.value, $('#m-tprice')?.value)
  } else if (modalMode === 'edit-type') {
    editRoomType(editingId, $('#m-tname')?.value, $('#m-tprice')?.value)
  } else if (modalMode === 'add-item') {
    addItem($('#m-iname')?.value, $('#m-iprice')?.value, $('#m-istock')?.value)
  } else if (modalMode === 'edit-item') {
    editItem(editingId, $('#m-iname')?.value, $('#m-iprice')?.value, $('#m-istock')?.value)
  } else if (modalMode === 'import-item') {
    handleImportSave()
    return
  } else if (modalMode === 'record-items') {
    closeModal()
    return
  } else if (modalMode === 'record-detail') {
    closeModal()
    return
  }
  closeModal()
}

// ═══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════m
document.addEventListener('DOMContentLoaded', async () => {
  // Window controls
  $('#btn-minimize').addEventListener('click', () => window.electronAPI.minimize())
  $('#btn-maximize').addEventListener('click', () => window.electronAPI.maximize())
  $('#btn-close').addEventListener('click', () => window.electronAPI.close())

  // Theme toggle
  $('#btn-theme-toggle').addEventListener('click', toggleTheme)
  initTheme()

  // Platform detection — add class to body for platform-specific CSS
  try {
    const platform = await window.electronAPI.invoke('app:get-platform')
    if (platform) document.body.classList.add('platform-' + platform)
  } catch (e) {
    /* ignore */
  }

  // Load & render
  await loadData()
  renderRoomList()
  if (rooms.length) selectRoom(rooms[0].id)
  else renderRoomDetail()

  // Navigation
  $$('.nav-tab').forEach(tab => tab.addEventListener('click', () => switchPage(tab.dataset.page)))
  $$('.admin-menu-item').forEach(item =>
    item.addEventListener('click', () => switchAdminSection(item.dataset.section))
  )

  // Add room (both checkin sidebar and admin page)
  dom.btnAddRoom.addEventListener('click', openAddRoomModal)
  $('#admin-btn-add-room').addEventListener('click', openAddRoomModal)
  $('#admin-btn-add-type').addEventListener('click', openAddTypeModal)
  $('#admin-btn-add-item').addEventListener('click', openAddItemModal)

  // Modal
  dom.modalClose.addEventListener('click', closeModal)
  dom.modalCancel.addEventListener('click', closeModal)
  dom.modalOverlay.addEventListener('click', e => {
    if (e.target === dom.modalOverlay) closeModal()
  })
  dom.modalConfirm.addEventListener('click', submitModal)
  document.addEventListener('keydown', e => {
    if (dom.modalOverlay.style.display !== 'none') {
      if (e.key === 'Enter') submitModal()
      if (e.key === 'Escape') closeModal()
    }
  })

  // Price input (live)
  let priceDebounce = null
  dom.inputPrice.addEventListener('input', () => {
    clearTimeout(priceDebounce)
    priceDebounce = setTimeout(() => {
      if (selectedRoomId) updateRoomPrice(selectedRoomId, dom.inputPrice.value)
    }, 300)
  })

  // Check in/out
  dom.btnCheckIn.addEventListener('click', () => {
    if (selectedRoomId) checkIn(selectedRoomId)
  })
  dom.btnCheckOut.addEventListener('click', () => {
    if (selectedRoomId) checkOut(selectedRoomId)
  })

  // Delete room (checkin page)
  dom.btnDeleteRoom.addEventListener('click', () => {
    if (selectedRoomId) {
      const r = getSelectedRoom()
      if (r && confirm(`Xóa phòng "${r.name}" và tất cả dữ liệu?`)) deleteRoom(selectedRoomId)
    }
  })

  // Filter
  dom.filterDate.addEventListener('change', () => renderRoomDetail())

  // Stats presets & custom date range
  $$('.stats-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      statsPreset = btn.dataset.preset
      $$('.stats-preset').forEach(b => b.classList.toggle('active', b === btn))
      dom.statsCustomDates.style.display = statsPreset === 'custom' ? '' : 'none'
      renderAdminStats()
    })
  })
  dom.statsBtnApply.addEventListener('click', () => renderAdminStats())

  // Global price
  $('#btn-apply-global-price').addEventListener('click', () => {
    const price = dom.globalPriceInput.value
    if (confirm(`Áp dụng ${formatMoney(parseInt(price) || 0)}/h cho TẤT CẢ ${rooms.length} phòng?`)) {
      applyGlobalPrice(price)
    }
  })

  // Live update every second — only update changing cells, not full re-render
  setInterval(() => {
    if (currentPage !== 'checkin') return
    const room = getSelectedRoom()
    if (!room || !isRoomOccupied(room)) return

    // Update stat: today hours
    const todayRecords = room.records.filter(r => isToday(r.checkIn))
    let totalMs = 0
    todayRecords.forEach(r => {
      totalMs += getDurationMs(r.checkIn, r.checkOut)
    })
    dom.statTodayHours.textContent = formatDurationShort(totalMs)

    // Update live duration cells
    document.querySelectorAll('[data-live-duration]').forEach(el => {
      const id = el.dataset.liveDuration
      if (!id) return
      const checkIn = el.dataset.checkin
      el.textContent = formatDuration(checkIn, null)
    })

    // Update live cost cells
    document.querySelectorAll('[data-live-cost]').forEach(el => {
      const id = el.dataset.liveCost
      if (!id) return
      const checkIn = el.dataset.checkin
      const price = parseFloat(el.dataset.price) || 0
      const itemsCost = parseFloat(el.dataset.itemsCost) || 0
      const hourlyCost = calculateCost(checkIn, null, price)
      el.textContent = price || itemsCost ? formatMoney(hourlyCost + itemsCost) : '—'
    })

    // Update live cost detail cells
    document.querySelectorAll('[data-live-cost-detail]').forEach(el => {
      const id = el.dataset.liveCostDetail
      if (!id) return
      const checkIn = el.dataset.checkin
      const price = parseFloat(el.dataset.price) || 0
      const itemsCost = parseFloat(el.dataset.itemsCost) || 0
      const hourlyCost = calculateCost(checkIn, null, price)
      el.textContent = `${formatMoney(hourlyCost)} + ${formatMoney(itemsCost)}`
    })
  }, 1000)
})
