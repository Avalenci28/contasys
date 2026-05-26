import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function formatMoney(value) {
  const v = Number(value ?? 0)
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function lsGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function lsGetBool(key, fallback) {
  const raw = localStorage.getItem(key)
  if (raw === null || raw === undefined) return fallback
  return raw === 'true'
}

function lsSet(key, value) {
  localStorage.setItem(key, value)
}

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

export default function Catalogo() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [previewMode, setPreviewMode] = useState(false)

  // Configuración (localStorage)
  const [mostrarPrecios, setMostrarPrecios] = useState(true)
  const [mostrarStock, setMostrarStock] = useState(true)
  const [bienvenida, setBienvenida] = useState('Bienvenido a nuestra tienda')
  const [whatsapp, setWhatsapp] = useState('')

  // Productos inventario + visibilidad catálogo (localStorage)
  const [productos, setProductos] = useState([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [productoVisibility, setProductoVisibility] = useState({}) // { [id]: true/false }

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [productos])

  const linkPublico = useMemo(() => {
    if (!empresaId) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/catalogo/${empresaId}`
  }, [empresaId])

  const keyMostrarPrecios = useMemo(() => `catalogo_mostrar_precios_${empresaId || ''}`, [empresaId])
  const keyMostrarStock = useMemo(() => `catalogo_mostrar_stock_${empresaId || ''}`, [empresaId])
  const keyBienvenida = useMemo(() => `catalogo_bienvenida_${empresaId || ''}`, [empresaId])
  const keyWhatsapp = useMemo(() => `catalogo_whatsapp_${empresaId || ''}`, [empresaId])
  const keyVisibilidad = useMemo(() => `catalogo_productos_${empresaId || ''}`, [empresaId])

  useEffect(() => {
    if (!empresaId) return

    setMostrarPrecios(lsGetBool(keyMostrarPrecios, true))
    setMostrarStock(lsGetBool(keyMostrarStock, true))
    setBienvenida(lsGetJSON(keyBienvenida, 'Bienvenido a nuestra tienda') ?? 'Bienvenido a nuestra tienda')

    // bienvenida guardada como string. lsGetJSON puede devolver string válido.
    const rawWa = localStorage.getItem(keyWhatsapp)
    setWhatsapp(rawWa || '')
    setProductoVisibility(lsGetJSON(keyVisibilidad, {}))
  }, [empresaId, keyMostrarPrecios, keyMostrarStock, keyBienvenida, keyWhatsapp, keyVisibilidad])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: invErr } = await supabase
          .from('inventario')
          .select('id,nombre,categoria,precio_venta,stock_actual')
          .eq('empresa_id', empresaId)
          .order('nombre')

        if (invErr) throw invErr
        if (!mounted) return

        setProductos(data ?? [])

        // asegurar visibilidad tiene default para productos nuevos
        setProductoVisibility((prev) => {
          const next = { ...(prev || {}) }
          for (const p of data ?? []) {
            if (next[p.id] === undefined) next[p.id] = true
          }
          lsSet(keyVisibilidad, JSON.stringify(next))
          return next
        })
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando catálogo')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, keyVisibilidad])

  const productosFiltradosAdmin = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => {
        if (!categoriaFiltro) return true
        return (p.categoria || '') === categoriaFiltro
      })
      .filter((p) => {
        if (!q) return true
        return `${p.nombre} ${p.id}`.toLowerCase().includes(q)
      })
  }, [productos, categoriaFiltro, busqueda])

  // Vista pública: solo visibles y (si aplica) stock
  const productosPublicos = useMemo(() => {
    return productos
      .filter((p) => !!productoVisibility[p.id])
      .filter((p) => (mostrarStock ? toNumber(p.stock_actual) > 0 : true))
  }, [productos, productoVisibility, mostrarStock])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkPublico)
      setCopyState('¡Copiado!')
      setTimeout(() => setCopyState('Copiar link'), 2000)
    } catch {
      // fallback
      try {
        const ta = document.createElement('textarea')
        ta.value = linkPublico
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopyState('¡Copiado!')
        setTimeout(() => setCopyState('Copiar link'), 2000)
      } catch {
        setError('No se pudo copiar el link')
      }
    }
  }

  const [copyState, setCopyState] = useState('Copiar link')

  function persistConfig(next) {
    setMostrarPrecios(next.mostrarPrecios)
    lsSet(keyMostrarPrecios, String(next.mostrarPrecios))

    setMostrarStock(next.mostrarStock)
    lsSet(keyMostrarStock, String(next.mostrarStock))

    setBienvenida(next.bienvenida)
    lsSet(keyBienvenida, JSON.stringify(next.bienvenida))

    setWhatsapp(next.whatsapp)
    lsSet(keyWhatsapp, next.whatsapp)
  }

  function toggleProducto(pId) {
    setProductoVisibility((prev) => {
      const next = { ...(prev || {}) }
      next[pId] = !next[pId]
      lsSet(keyVisibilidad, JSON.stringify(next))
      return next
    })
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando catálogo...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      {previewMode ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(4,52,44,.16)',
                background: '#fff',
                padding: '0 14px',
                cursor: 'pointer',
                fontWeight: 1000,
              }}
            >
              ← Volver al panel
            </button>

            <div style={{ fontWeight: 1000, opacity: 0.75 }}>
              Preview público
            </div>
          </div>

          <div style={{ marginTop: 14, background: '#0F6E56', borderRadius: 16, padding: 16, color: '#fff' }}>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>{empresa?.nombre || 'Empresa'}</div>
            <div style={{ marginTop: 6, opacity: 0.95, fontWeight: 900 }}>{bienvenida}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            {productosPublicos.length ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                }}
              >
                {productosPublicos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 8px 24px rgba(0,0,0,.04)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      minHeight: 210,
                    }}
                  >
                    <div style={{ fontSize: 42, lineHeight: 1 }}>🛍️</div>

                    <div style={{ fontWeight: 1000, color: '#04342C' }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>{p.categoria || '—'}</div>

                    {mostrarPrecios ? (
                      <div style={{ fontSize: 20, fontWeight: 1000, color: '#0F6E56' }}>{formatMoney(p.precio_venta)}</div>
                    ) : null}

                    {mostrarStock ? (
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 1000 }}>Stock: {p.stock_actual}</div>
                    ) : null}

                    <div style={{ marginTop: 'auto' }}>
                      {whatsapp ? (
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            height: 44,
                            borderRadius: 12,
                            border: '1px solid rgba(15,110,86,.45)',
                            background: '#0F6E56',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 1000,
                          }}
                          onClick={() => {
                            const text = `Hola, quiero pedir: ${p.nombre} - Precio: ${formatMoney(p.precio_venta)}`
                            const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`
                            window.open(url, '_blank')
                          }}
                        >
                          Pedir por WhatsApp
                        </button>
                      ) : (
                        <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 12, textAlign: 'center' }}>
                          WhatsApp no configurado
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, padding: 16, opacity: 0.8, fontWeight: 1000 }}>
                No hay productos en el catálogo aún
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', opacity: 0.7, fontWeight: 900, fontSize: 12 }}>
            Powered by ContaSys
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Catálogo Virtual</h2>
              <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Configura el catálogo compartible para tu empresa.</p>
            </div>

            <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
              <input
                readOnly
                value={linkPublico}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(4,52,44,.16)',
                  padding: '0 12px',
                  width: 420,
                  maxWidth: '90vw',
                  background: '#fff',
                  fontWeight: 1000,
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(4,52,44,.16)',
                    background: '#fff',
                    padding: '0 14px',
                    cursor: 'pointer',
                    fontWeight: 1000,
                  }}
                >
                  {copyState}
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(15,110,86,.45)',
                    background: '#0F6E56',
                    color: '#fff',
                    padding: '0 16px',
                    cursor: 'pointer',
                    fontWeight: 1000,
                  }}
                  disabled={loading || !empresaId}
                >
                  Ver catálogo
                </button>
              </div>
            </div>
          </div>

          {/* Configuración */}
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 1000, color: '#04342C' }}>Configuración del catálogo</div>
              {error ? <div style={{ color: '#b00020', fontWeight: 1000 }}>{error}</div> : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 1000, opacity: 0.85 }}>
                <input
                  type="checkbox"
                  checked={mostrarPrecios}
                  onChange={(e) => {
                    const next = { mostrarPrecios: e.target.checked, mostrarStock, bienvenida, whatsapp }
                    persistConfig(next)
                  }}
                />
                Mostrar precios
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 1000, opacity: 0.85 }}>
                <input
                  type="checkbox"
                  checked={mostrarStock}
                  onChange={(e) => {
                    const next = { mostrarPrecios, mostrarStock: e.target.checked, bienvenida, whatsapp }
                    persistConfig(next)
                  }}
                />
                Mostrar stock disponible
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 1000, opacity: 0.8 }}>Mensaje de bienvenida</span>
                <input
                  value={bienvenida}
                  onChange={(e) => {
                    const next = { mostrarPrecios, mostrarStock, bienvenida: e.target.value, whatsapp }
                    setBienvenida(e.target.value)
                    lsSet(keyBienvenida, JSON.stringify(e.target.value))
                  }}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 1000, opacity: 0.8 }}>WhatsApp de contacto</span>
                <input
                  value={whatsapp}
                  onChange={(e) => {
                    const next = e.target.value
                    setWhatsapp(next)
                    lsSet(keyWhatsapp, next)
                  }}
                  placeholder="Ej: 573001112233"
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                />
              </label>
            </div>
          </div>

          {/* Gestión de productos */}
          <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 1000, color: '#04342C' }}>Gestión de productos en catálogo</div>
              {loading ? <div style={{ opacity: 0.7, fontWeight: 1000 }}>Cargando...</div> : null}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre"
                style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 14px', minWidth: 320, background: '#fff', fontWeight: 1000 }}
                disabled={loading}
              />

              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 14px', minWidth: 220, background: '#fff', fontWeight: 1000 }}
                disabled={loading}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 1000 }}>
                {productosFiltradosAdmin.length} productos
              </div>
            </div>

            <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,110,86,.06)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Producto</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Categoría</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Precio venta</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Stock</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Visible en catálogo</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                        Cargando...
                      </td>
                    </tr>
                  ) : productosFiltradosAdmin.length ? (
                    productosFiltradosAdmin.map((p) => {
                      const visible = !!productoVisibility[p.id]
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)', background: visible ? '#fff' : 'rgba(0,0,0,.015)' }}>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>{p.nombre}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.8 }}>{p.categoria || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(p.precio_venta)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{p.stock_actual}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={() => toggleProducto(p.id)}
                              disabled={loading}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => toggleProducto(p.id)}
                              style={{
                                height: 34,
                                padding: '0 10px',
                                borderRadius: 12,
                                border: '1px solid rgba(4,52,44,.16)',
                                background: '#fff',
                                cursor: 'pointer',
                                fontWeight: 1000,
                              }}
                              disabled={loading}
                            >
                              {visible ? 'Ocultar' : 'Mostrar'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                        No hay productos en el filtro actual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

