// ═══════════════════════════════════════════════════════════
// Toast Notifications
// ═══════════════════════════════════════════════════════════

function showToast(msg, type = 'info') {
  const t = document.createElement('div')
  t.className = `toast toast--${type}`
  t.textContent = msg
  dom.toastContainer.appendChild(t)
  setTimeout(() => { t.classList.add('removing'); t.addEventListener('animationend', () => t.remove()) }, 3000)
}
