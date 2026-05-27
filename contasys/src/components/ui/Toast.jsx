import { useEffect } from 'react'


export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: { bg: '#0F6E56', icon: '✅' },
    error:   { bg: '#b00020', icon: '❌' },
    warning: { bg: '#D97706', icon: '⚠️' },
    info:    { bg: '#0b7286', icon: 'ℹ️' },
  }
  const c = colors[type] || colors.success

  return (
    <div style={{
      background: c.bg, color: '#fff', borderRadius: 14,
      padding: '14px 20px', display: 'flex', alignItems: 'center',
      gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      fontWeight: 900, fontSize: 14, minWidth: 260, maxWidth: 400,
      animation: 'slideInRight 0.3s ease',
    }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.2)', border: 'none',
        color: '#fff', borderRadius: 8, width: 28, height: 28,
        cursor: 'pointer', fontWeight: 1000, fontSize: 16,
      }}>✕</button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type}
          onClose={() => onRemove(t.id)} />
      ))}
    </div>
  )
}




