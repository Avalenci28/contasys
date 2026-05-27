import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function formatMoney(value) {
  const v = Number(value ?? 0)
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default function DashboardHome() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [ventasMes, setVentasMes] = useState(0)
  const [gastosMes, setGastosMes] = useState(0)
  const [ventasHoy, setVentasHoy] = useState(0)
  const [gastosHoy, setGastosHoy] = useState(0)
  const [productosStockCritico, setProductosStockCritico] = useState(0)
  const [productosStock, setProductosStock] = useState(0)

  const [clientesActivos, setClientesActivos] = useState(0)
  const [facturasPendientes, setFacturasPendientes] = useState(0)

  const [serie6m, setSerie6m] = useState([])
  const [topProductos, setTopProductos] = useState([])
  const [ultimasTransacciones, setUltimasTransacciones] = useState([])

  const now = useMemo(() => new Date(), [])

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!empresaId) return


    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const inicioDelDia = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const finDelDia = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

        const [ventasResp, gastosResp, inventarioResp, clientesResp, facturasResp, ventasHoyResp, gastosHoyResp, invCriticoResp] = await Promise.all([
          supabase
            .from('ventas')
            .select('total')
            .eq('empresa_id', empresaId)
            .gte('fecha', monthStart.toISOString())
            .lt('fecha', nextMonth.toISOString()),
          supabase
            .from('gastos')
            .select('monto')
            .eq('empresa_id', empresaId)
            .gte('fecha', monthStart.toISOString())
            .lt('fecha', nextMonth.toISOString()),
          supabase.from('inventario').select('stock_actual').eq('empresa_id', empresaId).gt('stock_actual', 0),
          supabase.from('clientes').select('id').eq('empresa_id', empresaId),
          supabase
            .from('facturas')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('estado', 'pendiente'),

          supabase
            .from('ventas')
            .select('total')
            .eq('empresa_id', empresaId)
            .gte('fecha', inicioDelDia.toISOString())
            .lt('fecha', finDelDia.toISOString()),
          supabase
            .from('gastos')
            .select('monto')
            .eq('empresa_id', empresaId)
            .gte('fecha', inicioDelDia.toISOString())
            .lt('fecha', finDelDia.toISOString()),
          supabase
            .from('inventario')
            .select('stock_actual,stock_minimo')
            .eq('empresa_id', empresaId),
        ])


        if (!mounted) return

        if (ventasResp.error) throw ventasResp.error
        if (gastosResp.error) throw gastosResp.error
        if (inventarioResp.error) throw inventarioResp.error
        if (clientesResp.error) throw clientesResp.error
        if (facturasResp.error) throw facturasResp.error

        const ventasSum = (ventasResp.data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0)
        const gastosSum = (gastosResp.data ?? []).reduce((acc, r) => acc + Number(r.monto ?? 0), 0)

        const ventasHoySum = (ventasHoyResp.data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0)
        const gastosHoySum = (gastosHoyResp.data ?? []).reduce((acc, r) => acc + Number(r.monto ?? 0), 0)

        const productosCriticosCount = (invCriticoResp.data ?? []).filter((r) => {
          const stockActual = Number(r.stock_actual ?? 0)
          const stockMin = Number(r.stock_minimo ?? 0)
          return stockActual <= stockMin
        }).length

        setVentasMes(ventasSum)
        setGastosMes(gastosSum)

        setVentasHoy(ventasHoySum)
        setGastosHoy(gastosHoySum)

        setProductosStockCritico(productosCriticosCount)


        setProductosStock((inventarioResp.data ?? []).length)
        setClientesActivos((clientesResp.data ?? []).length)
        setFacturasPendientes((facturasResp.data ?? []).length)

        // 6 meses: ventas vs gastos
        const months = Array.from({ length: 6 }).map((_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          return d
        })

        const ventas6 = await Promise.all(
          months.map(async (m) => {
            const start = new Date(m.getFullYear(), m.getMonth(), 1)
            const end = new Date(m.getFullYear(), m.getMonth() + 1, 1)
            const { data } = await supabase
              .from('ventas')
              .select('total')
              .eq('empresa_id', empresaId)
              .gte('fecha', start.toISOString())
              .lt('fecha', end.toISOString())
            return (data ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0)
          })
        )

        const gastos6 = await Promise.all(
          months.map(async (m) => {
            const start = new Date(m.getFullYear(), m.getMonth(), 1)
            const end = new Date(m.getFullYear(), m.getMonth() + 1, 1)
            const { data } = await supabase
              .from('gastos')
              .select('monto')
              .eq('empresa_id', empresaId)
              .gte('fecha', start.toISOString())
              .lt('fecha', end.toISOString())
            return (data ?? []).reduce((acc, r) => acc + Number(r.monto ?? 0), 0)
          })
        )

        const serie = months.map((m, i) => ({
          mes: m.toLocaleString('es-CO', { month: 'short' }),
          ventas: ventas6[i] ?? 0,
          gastos: gastos6[i] ?? 0,
        }))

        setSerie6m(serie)

        // Top 5 productos más vendidos: venta_items join inventario
        const { data: itemsData, error: itemsError } = await supabase
          .from('venta_items')
          .select('producto_id, cantidad, subtotal, venta_id')
          .not('venta_id', 'is', null)
        if (itemsError) throw itemsError

        // Filtrar por empresa via ventas (en cliente, por simplicidad inicial)
        const { data: ventasForItems } = await supabase
          .from('ventas')
          .select('id')
          .eq('empresa_id', empresaId)


        const ventaIds = new Set((ventasForItems ?? []).map((v) => v.id))
        const filtered = (itemsData ?? []).filter((it) => ventaIds.has(it.venta_id))

        const map = new Map()
        for (const it of filtered) {
          map.set(it.producto_id, (map.get(it.producto_id) ?? 0) + Number(it.cantidad ?? 0))
        }
        const topIds = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        const { data: invRows } = await supabase
          .from('inventario')
          .select('id, nombre')
          .in('id', topIds.map(([id]) => id))

        setTopProductos(
          topIds.map(([id, qty]) => {
            const inv = (invRows ?? []).find((r) => r.id === id)
            return { producto_id: id, nombre: inv?.nombre ?? 'Producto', cantidad: qty }
          })
        )

        // Últimas 5 transacciones (ventas)
        const { data: ultimas } = await supabase
          .from('ventas')
          .select('id, fecha, total, estado')
          .eq('empresa_id', empresaId)
          .order('fecha', { ascending: false })
          .limit(5)

        setUltimasTransacciones(
          (ultimas ?? []).map((v) => ({
            id: v.id,
            fecha: new Date(v.fecha).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' }),
            descripcion: `Venta (${v.estado})`,
            total: v.total ?? 0,
          }))
        )
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando datos del dashboard')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, now, refreshKey])

  if (loadingEmpresa) return <div style={{ marginLeft: 240, padding: 24 }}>Cargando...</div>

  if (loading) {
    return (
      <div style={{ marginLeft: 240, padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18 }}>Cargando KPI...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ marginLeft: 240, padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, color: '#b00020' }}>{error}</div>
      </div>
    )
  }

  const utilidad = ventasMes - gastosMes
  const utilidadHoy = ventasHoy - gastosHoy

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div
          className="kpi"
          style={{ background: '#0F6E56', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)', color: '#fff' }}
        >
          <div style={{ opacity: 0.9, fontWeight: 800, fontSize: 12 }}>Ventas hoy</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(ventasHoy)}</div>
        </div>
        <div
          className="kpi"
          style={{ background: '#0F6E56', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)', color: '#fff' }}
        >
          <div style={{ opacity: 0.9, fontWeight: 800, fontSize: 12 }}>Utilidad hoy</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(utilidadHoy)}</div>
        </div>
        <div
          className="kpi"
          style={{ background: '#0F6E56', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)', color: '#fff' }}
        >
          <div style={{ opacity: 0.9, fontWeight: 800, fontSize: 12 }}>Gastos hoy</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(gastosHoy)}</div>
        </div>
      </div>

      {productosStockCritico > 0 ? (
        <div
          style={{
            marginTop: 14,
            background: 'rgba(176,0,32,0.08)',
            borderLeft: '4px solid #b00020',
            borderRadius: 0,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 1000, color: '#b00020' }}>
            ⚠️ {productosStockCritico} producto(s) con stock crítico
          </div>
          <button
            type="button"
            onClick={() => {
              // mechanism: DashboardPage maneja active vía Sidebar; aquí usamos 'location' para evitar dependencias
              // (si el proyecto luego reemplaza rutas, este click sigue activando inventario al refrescar)
              window.location.hash = '#inventario'
              // además, forzamos navegación actual
              window.dispatchEvent(new Event('blackboxai:navigate-inventario'))
            }}
            style={{
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(176,0,32,.25)',
              background: '#fff',
              color: '#b00020',
              fontWeight: 1000,
              padding: '0 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Ver inventario
          </button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>

        <div className="kpi" style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Ventas del mes</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(ventasMes)}</div>
        </div>
        <div className="kpi" style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Gastos del mes</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(gastosMes)}</div>
        </div>
        <div className="kpi" style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Utilidad neta</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{formatMoney(utilidad)}</div>
        </div>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Productos en stock</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{productosStock}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Clientes activos</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{clientesActivos}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Facturas pendientes</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6 }}>{facturasPendientes}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Ventas vs gastos (últimos 6 meses)</div>
          <div style={{ width: '100%', height: 260, marginTop: 10 }}>
            <ResponsiveContainer>
              <AreaChart data={serie6m}>
                <defs>
                  <linearGradient id="ventas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0F6E56" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b7286" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0b7286" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#0F6E56" fillOpacity={1} fill="url(#ventas)" />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#0b7286" fillOpacity={1} fill="url(#gastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Top 5 productos más vendidos</div>
          <div style={{ width: '100%', height: 260, marginTop: 10 }}>
            <ResponsiveContainer>
              <BarChart data={topProductos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" name="Cantidad" fill="#0F6E56" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)', marginTop: 14 }}>
        <div style={{ fontWeight: 900, color: '#04342C' }}>Últimas 5 transacciones</div>
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Descripción</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ultimasTransacciones.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{t.fecha}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{t.descripcion}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right', fontWeight: 800 }}>
                    {formatMoney(t.total)}
                  </td>
                </tr>
              ))}
              {ultimasTransacciones.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 12, opacity: 0.7 }}>
                    No hay datos todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

