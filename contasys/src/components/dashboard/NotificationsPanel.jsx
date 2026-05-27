import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import useEmpresa from '../../hooks/useEmpresa'



function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value) {
  const v = toNumber(value)
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function startOfToday() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + toNumber(days))
  return d
}

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

function colorMeta(type) {
  if (type === 'stock') return { color: '#b00020', bg: 'rgba(176,0,32,0.08)', iconBg: 'rgba(176,0,32,0.10)' }
  if (type === 'deudas') return { color: '#D97706', bg: 'rgba(217,119,6,0.10)', iconBg: 'rgba(217,119,6,0.12)' }
  if (type === 'cotizaciones') return { color: '#0b7286', bg: 'rgba(11,114,134,0.10)', iconBg: 'rgba(11,114,134,0.12)' }
  return { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', iconBg: 'rgba(107,114,128,0.12)' }
}

function NotificationRow({ type, icon, title, subtitle }) {
  const meta = colorMeta(type)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        gap: 12,
        padding: '10px 12px',
        borderLeft: `3px solid ${meta.color}`,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: meta.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75, fontWeight: 800, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
    </div>
  )
}

export default function NotificationsPanel() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!open) return

    const onDocClick = (e) => {
      // Cerrar si el click fue fuera del panel/botón
      const panel = document.getElementById('notifs-panel')
      const btn = document.getElementById('notifs-button')
      const target = e.target
      if (!panel || !btn) return
      if (panel.contains(target) || btn.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  async function loadAll() {
    if (!empresaId) return
    setLoading(true)
    setError('')

    try {
      const hoy = startOfToday()
      const maxCotFecha = addDays(hoy, 3)

      // A - stock crítico
      const { data: invAll, error: invAllErr } = await supabase
        .from('inventario')
        .select('id,nombre,stock_actual,stock_minimo')
        .eq('empresa_id', empresaId)

      if (invAllErr) throw invAllErr

      const stockCritico = (invAll ?? []).filter((r) => toNumber(r.stock_actual) <= toNumber(r.stock_minimo))


      const stockNotifs = stockCritico.map((r) => ({
        type: 'stock',
        icon: '📦',
        title: `${r.nombre} tiene stock crítico (${toNumber(r.stock_actual)} unidades)`,
        subtitle: 'Revisa inventario y pedidos',
      }))

      // B - deudas vencidas (join clientes)
      const { data: deudasRows, error: deudasErr } = await supabase
        .from('deudas')
        .select('id,cliente_id,monto_total,monto_pagado,estado,concepto,fecha_vencimiento,clientes(nombre)')
        .eq('empresa_id', empresaId)
        .eq('estado', 'vencida')

      if (deudasErr) throw deudasErr

      const deudasNotifs = (deudasRows ?? []).map((d) => {
        const clienteNombre = d.clientes?.nombre || 'Cliente'
        const saldo = toNumber(d.monto_total) - toNumber(d.monto_pagado)
        return {
          type: 'deudas',
          icon: '💳',
          title: `Deuda vencida de ${clienteNombre} por ${formatMoney(saldo)}`,
          subtitle: 'Saldo pendiente de cobro',
        }
      })

      // C - cotizaciones enviadas por vencer
      const { data: cotRows, error: cotErr } = await supabase
        .from('cotizaciones')
        .select('id,fecha,validez_dias,estado,cliente_id')
        .eq('empresa_id', empresaId)
        .eq('estado', 'enviada')

      if (cotErr) throw cotErr

      const cotNotifs = (cotRows ?? [])
        .map((c) => {
          const fecha = c.fecha ? new Date(c.fecha) : null
          if (!fecha) return null
          const vence = addDays(fecha, c.validez_dias)
          return vence.getTime() <= maxCotFecha.getTime()
            ? {
                type: 'cotizaciones',
                icon: '📋',
                title: 'Cotización enviada vence pronto',
                subtitle: `Vence el ${vence.toLocaleDateString('es-CO')}`,
              }
            : null
        })
        .filter(Boolean)

      // D - facturas pendientes
      const { data: factRows, error: factErr } = await supabase
        .from('facturas')
        .select('id,estado,cliente_id')
        .eq('empresa_id', empresaId)
        .eq('estado', 'pendiente')

      if (factErr) throw factErr

      const factNotifs = (factRows ?? []).map(() => ({
        type: 'facturas',
        icon: '🧾',
        title: 'Factura pendiente de cobro',
        subtitle: 'Pendiente de pago',
      }))

      const all = [...stockNotifs, ...deudasNotifs, ...cotNotifs, ...factNotifs]
      setNotifications(all)
    } catch (e) {
      setError(e?.message || 'Error cargando notificaciones')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const totalCount = notifications.length

  return (
    <>
      <button
        id="notifs-button"
        type="button"
        className={open ? 'iconBtn notifs-open' : 'iconBtn'}
        aria-label="Notificaciones"
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) void loadAll()
            return next
          })
        }}
        style={{ position: 'relative' }}
      >
        🔔
        {totalCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: '#b00020',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 7px',
              fontSize: 12,
              fontWeight: 1000,
              lineHeight: 1.1,
            }}
          >
            {totalCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="notifs-panel"
          style={{
            position: 'absolute',
            right: 22,
            top: 72,
            width: 360,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 18px 60px rgba(0,0,0,.25)',
            padding: 14,
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 4px 10px' }}>
            <div style={{ fontWeight: 1000, color: '#04342C', fontSize: 16 }}>Notificaciones</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 34,
                width: 34,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,.10)',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 1000,
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {error ? <div style={{ color: '#b00020', fontWeight: 1000, padding: 12 }}>{error}</div> : null}

          {loading ? (
            <div style={{ padding: 12, opacity: 0.75, fontWeight: 900 }}>Cargando...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 18, textAlign: 'center', fontWeight: 1000, color: '#04342C' }}>✅ Todo al día</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {notifications.map((n, idx) => (
                <NotificationRow key={`${n.type}-${idx}`} type={n.type} icon={n.icon} title={n.title} subtitle={n.subtitle} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

