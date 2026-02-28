// ═══════════════════════════════════════════════════════════
// Helper Utilities
// ═══════════════════════════════════════════════════════════

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr), n = new Date()
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function calculateItemsCost(items) {
  if (!items || !items.length) return 0
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}

function calculateRecordTotal(checkIn, checkOut, pricePerHour, items) {
  return calculateCost(checkIn, checkOut, pricePerHour) + calculateItemsCost(items)
}
