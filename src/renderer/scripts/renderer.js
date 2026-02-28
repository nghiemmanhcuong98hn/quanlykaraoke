// ═══════════════════════════════════════════════════════════
// Room Management — Renderer
// ═══════════════════════════════════════════════════════════

// ─── State ──────────────────────────────────────────────────
let rooms = []
let roomTypes = []
let selectedRoomId = null
let currentPage = 'checkin'
let currentAdminSection = 'admin-rooms'
let modalMode = null // 'add-room' | 'edit-room' | 'add-type' | 'edit-type'
let editingId = null

// ─── DOM Cache ──────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

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
  globalPriceInput: $('#global-price-input'),
  pricingTypesList: $('#pricing-types-list'),
  pricingNoTypes: $('#pricing-no-types'),
  // Stats
  statsRevenueToday: $('#stats-revenue-today'),
  statsRevenueMonth: $('#stats-revenue-month'),
  statsRevenueAll: $('#stats-revenue-all'),
  statsTotalUsage: $('#stats-total-usage'),
  statsRoomBody: $('#stats-room-body'),
  // Modal
  modalOverlay: $('#modal-overlay'),
  modalTitle: $('#modal-title'),
  modalBody: $('#modal-body'),
  modalClose: $('#modal-close'),
  modalCancel: $('#modal-cancel'),
  modalConfirm: $('#modal-confirm'),
  // Toast
  toastContainer: $('#toast-container'),
}

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════
async function loadData() {
  try {
    const data = await window.electronAPI.invoke('db:get-data')
    rooms = data.rooms || []
    roomTypes = data.roomTypes || []
  } catch (err) {
    console.error('Failed to load data:', err)
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

function formatTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
}

function getDurationMs(checkIn, checkOut) {
  if (!checkIn) return 0
  return Math.max(0, (checkOut ? new Date(checkOut) : new Date()) - new Date(checkIn))
}

function formatDuration(checkIn, checkOut) {
  if (!checkIn) return '—'
  const s = Math.floor(getDurationMs(checkIn, checkOut) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function formatDurationShort(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

function calculateCost(checkIn, checkOut, pricePerHour) {
  if (!checkIn || !pricePerHour) return 0
  return Math.ceil((getDurationMs(checkIn, checkOut) / 3600000) * pricePerHour)
}

function formatMoney(amount) {
  if (!amount) return '0₫'
  return amount.toLocaleString('vi-VN') + '₫'
}

function isToday(dateStr) {
  const d = new Date(dateStr), n = new Date()
  return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear()
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr), n = new Date()
  return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear()
}

function getSelectedRoom() { return rooms.find(r => r.id === selectedRoomId) }
function isRoomOccupied(room) { return room && room.records.some(r => !r.checkOut) }
function getRoomTypeName(typeId) { const t = roomTypes.find(t => t.id === typeId); return t ? t.name : '—' }

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
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
  $$('.admin-section').forEach(s => s.style.display = s.id === section ? '' : 'none')
  renderAdminSection(section)
}

function renderAdminSection(section) {
  if (section === 'admin-rooms') renderAdminRooms()
  else if (section === 'admin-room-types') renderAdminRoomTypes()
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
  if (!room) { dom.emptyState.style.display=''; dom.roomDetail.style.display='none'; return }
  dom.emptyState.style.display='none'; dom.roomDetail.style.display=''

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
  todayRecords.forEach(r => { totalMs += getDurationMs(r.checkIn, r.checkOut) })
  dom.statTodayHours.textContent = formatDurationShort(totalMs)

  renderRecords(room)
}

function renderRecords(room) {
  let records = [...room.records]
  if (dom.filterDate.value === 'today') records = records.filter(r => isToday(r.checkIn))
  records.sort((a,b) => new Date(b.checkIn) - new Date(a.checkIn))

  if (!records.length) { dom.recordsBody.innerHTML=''; dom.noRecords.style.display=''; return }
  dom.noRecords.style.display='none'
  dom.recordsBody.innerHTML = ''

  records.forEach((rec, i) => {
    const active = !rec.checkOut
    const cost = calculateCost(rec.checkIn, rec.checkOut, room.pricePerHour)
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px;">${records.length-i}</td>
      <td><span class="time-value">${formatTime(rec.checkIn)}</span><div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">${formatDate(rec.checkIn)}</div></td>
      <td><span class="time-value">${active ? '—' : formatTime(rec.checkOut)}</span>${!active ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:1px">${formatDate(rec.checkOut)}</div>` : ''}</td>
      <td><span class="duration-value">${formatDuration(rec.checkIn, rec.checkOut)}</span></td>
      <td><span class="money-value">${room.pricePerHour ? formatMoney(cost) : '—'}</span></td>
      <td><span class="status-badge ${active ? 'status-badge--active' : 'status-badge--done'}"><span class="status-dot ${active ? 'status-dot--active' : ''}"></span>${active ? 'Trong phòng' : 'Đã ra'}</span></td>`
    dom.recordsBody.appendChild(tr)
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Rooms
// ═══════════════════════════════════════════════════════════
function renderAdminRooms() {
  if (!rooms.length) { dom.adminRoomsBody.innerHTML=''; dom.adminRoomsEmpty.style.display=''; return }
  dom.adminRoomsEmpty.style.display='none'
  dom.adminRoomsBody.innerHTML = ''
  rooms.forEach((room, i) => {
    const occupied = isRoomOccupied(room)
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i+1}</td>
      <td><span class="time-value">${escapeHtml(room.name)}</span></td>
      <td>${getRoomTypeName(room.roomTypeId)}</td>
      <td>${room.pricePerHour ? formatMoney(room.pricePerHour) + '/h' : '—'}</td>
      <td><span class="status-badge ${occupied?'status-badge--active':'status-badge--done'}"><span class="status-dot ${occupied?'status-dot--active':''}"></span>${occupied?'Đang dùng':'Trống'}</span></td>
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
    btn.addEventListener('click', () => { if(confirm('Xóa phòng này và tất cả dữ liệu?')) deleteRoom(btn.dataset.id) })
  })
}

// ═══════════════════════════════════════════════════════════
// RENDER — Admin: Room Types
// ═══════════════════════════════════════════════════════════
function renderAdminRoomTypes() {
  if (!roomTypes.length) { dom.adminTypesBody.innerHTML=''; dom.adminTypesEmpty.style.display=''; return }
  dom.adminTypesEmpty.style.display='none'
  dom.adminTypesBody.innerHTML = ''
  roomTypes.forEach((type, i) => {
    const count = rooms.filter(r => r.roomTypeId === type.id).length
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i+1}</td>
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
    btn.addEventListener('click', () => { if(confirm('Xóa loại phòng này?')) deleteRoomType(btn.dataset.id) })
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
function renderAdminStats() {
  let revenueToday = 0, revenueMonth = 0, revenueAll = 0, totalUsage = 0

  const roomStats = rooms.map(room => {
    let roomRevenue = 0, roomDurationMs = 0, roomUsage = 0
    room.records.forEach(rec => {
      if (!rec.checkOut) return
      const cost = calculateCost(rec.checkIn, rec.checkOut, room.pricePerHour)
      const dur = getDurationMs(rec.checkIn, rec.checkOut)
      roomRevenue += cost
      roomDurationMs += dur
      roomUsage++
      revenueAll += cost
      totalUsage++
      if (isToday(rec.checkOut)) revenueToday += cost
      if (isThisMonth(rec.checkOut)) revenueMonth += cost
    })
    return { room, roomRevenue, roomDurationMs, roomUsage }
  })

  dom.statsRevenueToday.textContent = formatMoney(revenueToday)
  dom.statsRevenueMonth.textContent = formatMoney(revenueMonth)
  dom.statsRevenueAll.textContent = formatMoney(revenueAll)
  dom.statsTotalUsage.textContent = totalUsage

  // Table
  roomStats.sort((a,b) => b.roomRevenue - a.roomRevenue)
  dom.statsRoomBody.innerHTML = ''
  roomStats.forEach((rs, i) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td style="color:var(--text-tertiary);font-size:12px">${i+1}</td>
      <td><span class="time-value">${escapeHtml(rs.room.name)}</span></td>
      <td>${getRoomTypeName(rs.room.roomTypeId)}</td>
      <td>${rs.roomUsage}</td>
      <td><span class="duration-value">${formatDurationShort(rs.roomDurationMs)}</span></td>
      <td><span class="money-value">${formatMoney(rs.roomRevenue)}</span></td>`
    dom.statsRoomBody.appendChild(tr)
  })
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Rooms
// ═══════════════════════════════════════════════════════════
function selectRoom(id) {
  selectedRoomId = id
  renderRoomList()
  renderRoomDetail()
}

async function addRoom(name, pricePerHour, roomTypeId) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room', { name: name.trim(), pricePerHour: parseInt(pricePerHour) || 0, roomTypeId: roomTypeId || null })
  await loadData()
  renderRoomList()
  renderAdminRooms()
  if (!selectedRoomId && rooms.length) selectRoom(rooms[0].id)
  showToast('Đã thêm phòng', 'success')
}

async function editRoom(id, name, pricePerHour, roomTypeId) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room', { id, name: name.trim(), pricePerHour: parseInt(pricePerHour) || 0, roomTypeId: roomTypeId || null })
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
  await window.electronAPI.invoke('db:save-room', { id, pricePerHour: parseInt(price) || 0, name: rooms.find(r => r.id === id).name })
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
  await window.electronAPI.invoke('db:save-room-type', { name: name.trim(), defaultPrice: parseInt(defaultPrice) || 0 })
  await loadData()
  renderAdminRoomTypes()
  renderAdminPricing()
  showToast('Đã thêm loại phòng', 'success')
}

async function editRoomType(id, name, defaultPrice) {
  if (!name.trim()) return
  await window.electronAPI.invoke('db:save-room-type', { id, name: name.trim(), defaultPrice: parseInt(defaultPrice) || 0 })
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
// MODAL
// ═══════════════════════════════════════════════════════════
function buildRoomTypeOptions(selectedId) {
  let opts = '<option value="">-- Không chọn --</option>'
  roomTypes.forEach(t => {
    opts += `<option value="${t.id}" ${t.id===selectedId?'selected':''}>${escapeHtml(t.name)} (${formatMoney(t.defaultPrice)}/h)</option>`
  })
  return opts
}

function openAddRoomModal() {
  modalMode = 'add-room'; editingId = null
  dom.modalTitle.textContent = 'Thêm phòng mới'
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên phòng</label><input type="text" id="m-name" class="form-input" placeholder="VD: Phòng 101" autofocus /></div>
    <div class="form-group"><label class="form-label">Loại phòng</label><select id="m-type" class="form-input">${buildRoomTypeOptions(null)}</select></div>
    <div class="form-group"><label class="form-label">Giá mỗi giờ (₫)</label><input type="number" id="m-price" class="form-input" placeholder="VD: 50000" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Thêm phòng'
  openModal()
  // Auto-fill price when selecting type
  setTimeout(() => {
    const typeSelect = $('#m-type')
    if (typeSelect) typeSelect.addEventListener('change', () => {
      const t = roomTypes.find(t => t.id === typeSelect.value)
      if (t) $('#m-price').value = t.defaultPrice || ''
    })
  }, 50)
}

function openEditRoomModal(id) {
  const room = rooms.find(r => r.id === id)
  if (!room) return
  modalMode = 'edit-room'; editingId = id
  dom.modalTitle.textContent = 'Sửa phòng'
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên phòng</label><input type="text" id="m-name" class="form-input" value="${escapeHtml(room.name)}" /></div>
    <div class="form-group"><label class="form-label">Loại phòng</label><select id="m-type" class="form-input">${buildRoomTypeOptions(room.roomTypeId)}</select></div>
    <div class="form-group"><label class="form-label">Giá mỗi giờ (₫)</label><input type="number" id="m-price" class="form-input" value="${room.pricePerHour||''}" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Lưu'
  openModal()
}

function openAddTypeModal() {
  modalMode = 'add-type'; editingId = null
  dom.modalTitle.textContent = 'Thêm loại phòng'
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên loại phòng</label><input type="text" id="m-tname" class="form-input" placeholder="VD: VIP, Thường, Phòng họp..." autofocus /></div>
    <div class="form-group"><label class="form-label">Giá mặc định/giờ (₫)</label><input type="number" id="m-tprice" class="form-input" placeholder="VD: 50000" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Thêm'
  openModal()
}

function openEditTypeModal(id) {
  const type = roomTypes.find(t => t.id === id)
  if (!type) return
  modalMode = 'edit-type'; editingId = id
  dom.modalTitle.textContent = 'Sửa loại phòng'
  dom.modalBody.innerHTML = `
    <div class="form-group"><label class="form-label">Tên loại phòng</label><input type="text" id="m-tname" class="form-input" value="${escapeHtml(type.name)}" /></div>
    <div class="form-group"><label class="form-label">Giá mặc định/giờ (₫)</label><input type="number" id="m-tprice" class="form-input" value="${type.defaultPrice||''}" min="0" step="1000" /></div>`
  dom.modalConfirm.textContent = 'Lưu'
  openModal()
}

function openModal() {
  dom.modalOverlay.style.display = ''
  setTimeout(() => { const first = dom.modalBody.querySelector('input'); if(first) first.focus() }, 100)
}

function closeModal() { dom.modalOverlay.style.display = 'none'; modalMode = null; editingId = null }

function submitModal() {
  if (modalMode === 'add-room') {
    addRoom($('#m-name')?.value, $('#m-price')?.value, $('#m-type')?.value)
  } else if (modalMode === 'edit-room') {
    editRoom(editingId, $('#m-name')?.value, $('#m-price')?.value, $('#m-type')?.value)
  } else if (modalMode === 'add-type') {
    addRoomType($('#m-tname')?.value, $('#m-tprice')?.value)
  } else if (modalMode === 'edit-type') {
    editRoomType(editingId, $('#m-tname')?.value, $('#m-tprice')?.value)
  }
  closeModal()
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function showToast(msg, type='info') {
  const t = document.createElement('div')
  t.className = `toast toast--${type}`
  t.textContent = msg
  dom.toastContainer.appendChild(t)
  setTimeout(() => { t.classList.add('removing'); t.addEventListener('animationend', () => t.remove()) }, 3000)
}

// ═══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════m
document.addEventListener('DOMContentLoaded', async () => {
  // Window controls
  $('#btn-minimize').addEventListener('click', () => window.electronAPI.minimize())
  $('#btn-maximize').addEventListener('click', () => window.electronAPI.maximize())
  $('#btn-close').addEventListener('click', () => window.electronAPI.close())

  // Load & render
  await loadData()
  renderRoomList()
  if (rooms.length) selectRoom(rooms[0].id)
  else renderRoomDetail()

  // Navigation
  $$('.nav-tab').forEach(tab => tab.addEventListener('click', () => switchPage(tab.dataset.page)))
  $$('.admin-menu-item').forEach(item => item.addEventListener('click', () => switchAdminSection(item.dataset.section)))

  // Add room (both checkin sidebar and admin page)
  dom.btnAddRoom.addEventListener('click', openAddRoomModal)
  $('#admin-btn-add-room').addEventListener('click', openAddRoomModal)
  $('#admin-btn-add-type').addEventListener('click', openAddTypeModal)

  // Modal
  dom.modalClose.addEventListener('click', closeModal)
  dom.modalCancel.addEventListener('click', closeModal)
  dom.modalOverlay.addEventListener('click', e => { if(e.target===dom.modalOverlay) closeModal() })
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
    priceDebounce = setTimeout(() => { if(selectedRoomId) updateRoomPrice(selectedRoomId, dom.inputPrice.value) }, 300)
  })

  // Check in/out
  dom.btnCheckIn.addEventListener('click', () => { if(selectedRoomId) checkIn(selectedRoomId) })
  dom.btnCheckOut.addEventListener('click', () => { if(selectedRoomId) checkOut(selectedRoomId) })

  // Delete room (checkin page)
  dom.btnDeleteRoom.addEventListener('click', () => {
    if (selectedRoomId) { const r=getSelectedRoom(); if(r && confirm(`Xóa phòng "${r.name}" và tất cả dữ liệu?`)) deleteRoom(selectedRoomId) }
  })

  // Filter
  dom.filterDate.addEventListener('change', () => renderRoomDetail())

  // Global price
  $('#btn-apply-global-price').addEventListener('click', () => {
    const price = dom.globalPriceInput.value
    if (confirm(`Áp dụng ${formatMoney(parseInt(price)||0)}/h cho TẤT CẢ ${rooms.length} phòng?`)) {
      applyGlobalPrice(price)
    }
  })

  // Live update every second
  setInterval(() => {
    if (currentPage === 'checkin') {
      const room = getSelectedRoom()
      if (room && isRoomOccupied(room)) renderRoomDetail()
    }
  }, 1000)
})
