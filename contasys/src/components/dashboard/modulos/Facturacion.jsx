import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return String(value)
  }
}

function badgeStyles(estado) {
  const e = (estado || '').toLowerCase()
  if (e === 'pagada' || e === 'paid') {
    return { background: 'rgba(16,185,129,.12)', color: '#047857', border: '1px solid rgba(16,185,129,.35)' }
  }
  if (e === 'vencida') {
    return { background: 'rgba(239,68,68,.12)', color: '#b00020', border: '1px solid rgba(239,68,68,.35)' }
  }
  return { background: 'rgba(245,158,11,.12)', color: '#92400e', border: '1px solid rgba(245,158,11,.35)' }
}

function normalizeText(v) {
  return String(v ?? '').trim()
}

export default function Facturacion() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [estado, setEstado] = useState('') // '', 'pendiente', 'pagada', 'vencida'
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [facturas, setFacturas] = useState([])
  const [clientes, setClientes] = useState([])

  const [stats, setStats] = useState({ pendiente: 0, pagada: 0, vencida: 0 })

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError('')

        // clientes para mostrar nombre (opcional)
        const { data: cliData, error: cErr } = await supabase
          .from('clientes')
          .select('id,nombre')
          .eq('empresa_id', empresaId)
          .order('nombre')

        if (!mounted) return
        if (cErr) throw cErr
        setClientes(cliData ?? [])

        const base = supabase
          .from('facturas')
          .select('id, numero_factura, fecha_emision, fecha_vencimiento, estado, total, cliente_id')
          .eq('empresa_id', empresaId)

        if (estado) {
          base.eq('estado', estado)
        }

        if (fechaDesde) {
          base.gte('fecha_emision', new Date(fechaDesde).toISOString())
        }

        if (fechaHasta) {
          base.lt('fecha_emision', new Date(new Date(fechaHasta).setHours(23, 59, 59)).toISOString())
        }

        const { data, error: fErr } = await base
          .order('fecha_emision', { ascending: false })

        if (!mounted) return
        if (fErr) throw fErr

        const rows = data ?? []
        setFacturas(rows)

        // stats
        let pend = 0
        let pag = 0
        let ven = 0
        for (const r of rows) {
          const e = normalizeText(r.estado).toLowerCase()
          if (e === 'pagada') pag += 1
          else if (e === 'vencida') ven += 1
          else pend += 1
        }
        setStats({ pendiente: pend, pagada: pag, vencida: ven })
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando facturas')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, estado, fechaDesde, fechaHasta])

  const clienteMap = useMemo(() => {
    const m = new Map()
    for (const c of clientes) m.set(c.id, c.nombre)
    return m
  }, [clientes])

  async function markPagada(facturaId) {
    const ok = window.confirm('¿Marcar esta factura como pagada?')
    if (!ok) return

    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('facturas').update({ estado: 'pagada' }).eq('id', facturaId)
      if (err) throw err

      // recargar
      const base = supabase
        .from('facturas')
        .select('id, numero_factura, fecha_emision, fecha_vencimiento, estado, total, cliente_id')
        .eq('empresa_id', empresaId)

      if (estado) base.eq('estado', estado)
      if (fechaDesde) base.gte('fecha_emision', new Date(fechaDesde).toISOString())
      if (fechaHasta) base.lt('fecha_emision', new Date(new Date(fechaHasta).setHours(23, 59, 59)).toISOString())

      const { data, error: fErr } = await base.order('fecha_emision', { ascending: false })
      if (fErr) throw fErr
      const rows = data ?? []
      setFacturas(rows)
    } catch (e) {
      setError(e?.message || 'Error marcando como pagada')
    } finally {
      setLoading(false)
    }
  }

  const pieData = useMemo(() => {
    return [
      { name: 'Pendiente', value: stats.pendiente, key: 'pendiente' },
      { name: 'Pagada', value: stats.pagada, key: 'pagada' },
      { name: 'Vencida', value: stats.vencida, key: 'vencida' },
    ]
  }, [stats])

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando facturación...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Facturación</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Gestiona facturas y estados de pago.</p>
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
            Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}>
              <option value="">Todos</option>
              <option value="pendiente">pendiente</option>
              <option value="pagada">pagada</option>
              <option value="vencida">vencida</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
            Desde
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }} />
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
            Hasta
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Distribución</div>
          <div style={{ width: '100%', height: 260, marginTop: 10 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {pieData.map((d, i) => (
                    <Cell
                      key={d.key}
                      fill={i === 0 ? '#F59E0B' : i === 1 ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 6, fontWeight: 900, opacity: 0.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Pendiente</span>
              <span>{stats.pendiente}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Pagada</span>
              <span>{stats.pagada}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Vencida</span>
              <span>{stats.vencida}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,110,86,.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Factura</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Emisión</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Vencimiento</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Total</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Estado</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                    Cargando...
                  </td>
                </tr>
              ) : facturas.length ? (
                facturas.map((f, idx) => {
                  const st = normalizeText(f.estado)
                  const badge = badgeStyles(st)
                  const clienteNombre = f.cliente_id ? clienteMap.get(f.cliente_id) : null
                  const canMark = st === 'pendiente'

                  return (
                    <tr key={f.id} style={{ background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,.01)', borderTop: '1px solid rgba(0,0,0,.04)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>
                        {f.numero_factura ? `#${f.numero_factura}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>{clienteNombre || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.85 }}>{formatDateTime(f.fecha_emision)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.85 }}>{formatDateTime(f.fecha_vencimiento)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                        {(f.total ?? 0).toLocaleString('es-CO')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontWeight: 1000,
                            padding: '6px 10px',
                            borderRadius: 999,
                            background: badge.background,
                            color: badge.color,
                            border: badge.border,
                          }}
                        >
                          {st || 'pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {canMark ? (
                          <button
                            type="button"
                            onClick={() => markPagada(f.id)}
                            style={{
                              height: 36,
                              padding: '0 12px',
                              borderRadius: 12,
                              border: '1px solid rgba(16,185,129,.45)',
                              background: 'rgba(16,185,129,.10)',
                              cursor: 'pointer',
                              fontWeight: 1000,
                            }}
                          >
                            Marcar pagada
                          </button>
                        ) : (
                          <span style={{ opacity: 0.6, fontWeight: 900 }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                    No hay facturas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <div style={{ marginTop: 14, color: '#b00020', fontWeight: 900 }}>{error}</div> : null}
    </div>
  )
}

