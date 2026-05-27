import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const MAX_PER_TYPE = 4

const TYPE_META = {
  producto: { label: 'producto', icon: '📦' },
  cliente: { label: 'cliente', icon: '👥' },
  venta: { label: 'venta', icon: '💰' },
  cotizacion: { label: 'cotizacion', icon: '📋' },
}

function isNumberString(s) {
  if (typeof s !== 'string') return false
  const t = s.trim()
  if (!t) return false
  return /^-?\d+(\.\d+)?$/.test(t)
}

function safeToNumberMaybe(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function GlobalSearch({ empresaId, onNavigate }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({
    producto: [],
    cliente: [],
    venta: [],
    cotizacion: [],
  })

  const containerRef = useRef(null)
  const debounceTimer = useRef(null)
  const activeRequestId = useRef(0)

  const trimmed = useMemo(() => query.trim(), [query])

  useEffect(() => {
    function onDocMouseDown(e) {
      const el = containerRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }

    function onDocKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [])

  useEffect(() => {
    const q = trimmed

    if (!empresaId) {
      setOpen(false)
      setLoading(false)
      setResults({ producto: [], cliente: [], venta: [], cotizacion: [] })
      return
    }

    if (q.length < 2) {
      setOpen(false)
      setLoading(false)
      setResults({ producto: [], cliente: [], venta: [], cotizacion: [] })
      return
    }

    setOpen(true)
    setLoading(true)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      const requestId = ++activeRequestId.current
      const qLike = `%${q}%`

      const qNumber = isNumberString(q) ? safeToNumberMaybe(q) : null

      const pProductos = supabase
        .from('inventario')
        .select('id,nombre,codigo_barras')
        .eq('empresa_id', empresaId)
        .or(`nombre.ilike.${qLike},codigo_barras.ilike.${qLike}`)
        .limit(MAX_PER_TYPE)

      const pClientes = supabase
        .from('clientes')
        .select('id,nombre')
        .eq('empresa_id', empresaId)
        .ilike('nombre', qLike)
        .limit(MAX_PER_TYPE)

      // Ventas: notas + total si q es número
      // (si es número, hacemos filtro OR; si no, solo notas)
      let pVentas = supabase
        .from('ventas')
        .select('id,notas,total,created_at')
        .eq('empresa_id', empresaId)

      if (qNumber !== null) {
        pVentas = pVentas.or(`notas.ilike.${qLike},total.eq.${qNumber}`)
      } else {
        pVentas = pVentas.ilike('notas', qLike)
      }

      pVentas = pVentas.limit(MAX_PER_TYPE)

      const pCotizaciones = supabase
        .from('cotizaciones')
        .select('id,notas,created_at')
        .eq('empresa_id', empresaId)
        .ilike('notas', qLike)
        .limit(MAX_PER_TYPE)

      Promise.all([pProductos, pClientes, pVentas, pCotizaciones])
        .then(([prodRes, cliRes, venRes, cotRes]) => {
          if (requestId !== activeRequestId.current) return

          const productos = prodRes.data ?? []
          const clientes = cliRes.data ?? []
          const ventas = venRes.data ?? []
          const cotizaciones = cotRes.data ?? []

          setResults({
            producto: productos.map((r) => ({
              id: r.id,
              nombre: r.nombre || r.codigo_barras || 'Producto',
              tipo: 'producto',
              icono: TYPE_META.producto.icon,
            })),
            cliente: clientes.map((r) => ({
              id: r.id,
              nombre: r.nombre || 'Cliente',
              tipo: 'cliente',
              icono: TYPE_META.cliente.icon,
            })),
            venta: ventas.map((r) => ({
              id: r.id,
              nombre: r.notas || (r.total != null ? `Venta • ${r.total}` : 'Venta'),
              tipo: 'venta',
              icono: TYPE_META.venta.icon,
            })),
            cotizacion: cotizaciones.map((r) => ({
              id: r.id,
              nombre: r.notas || 'Cotización',
              tipo: 'cotizacion',
              icono: TYPE_META.cotizacion.icon,
            })),
          })
        })
        .catch(() => {
          if (requestId !== activeRequestId.current) return
          setResults({ producto: [], cliente: [], venta: [], cotizacion: [] })
        })
        .finally(() => {
          if (requestId !== activeRequestId.current) return
          setLoading(false)
        })
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [trimmed, empresaId])

  const hasAny =
    results.producto.length ||
    results.cliente.length ||
    results.venta.length ||
    results.cotizacion.length

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar..."
        className={''}
        style={{
          height: 44,
          borderRadius: 12,
          border: '1px solid rgba(4,52,44,.16)',
          background: '#fff',
          padding: '0 14px',
          minWidth: 320,
          fontWeight: 800,
        }}
        aria-label="Buscar"
        onFocus={() => {
          if (trimmed.length >= 2) setOpen(true)
        }}
      />

      {open ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: 'var(--bg-card)',
            borderRadius: 14,
            boxShadow: '0 18px 50px rgba(0,0,0,.24)',
            zIndex: 1000,
            maxHeight: 420,
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 1000, color: '#04342C', fontSize: 12, opacity: 0.8 }}>
              {loading ? 'Buscando...' : trimmed ? `Resultados para “${trimmed}”` : 'Escribe para buscar'}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 12, opacity: 0.75, fontWeight: 900 }}>
              Buscando...
            </div>
          ) : hasAny ? (
            <div style={{ padding: 8 }}>
              {(['producto', 'cliente', 'venta', 'cotizacion']).map((tipo) => {
                const list = results[tipo] || []
                if (!list.length) return null
                return (
                  <div key={tipo} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        padding: '6px 8px',
                        opacity: 0.7,
                        fontWeight: 1000,
                        fontSize: 12,
                      }}
                    >
                      {TYPE_META[tipo].icon} {TYPE_META[tipo].label}
                    </div>
                    <div>
                      {list.slice(0, MAX_PER_TYPE).map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setOpen(false)
                            const map = {
                              producto: 'inventario',
                              cliente: 'clientes',
                              venta: 'ventas',
                              cotizacion: 'cotizaciones',
                            }
                            onNavigate?.(map[item.tipo])
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setOpen(false)
                              const map = {
                                producto: 'inventario',
                                cliente: 'clientes',
                                venta: 'ventas',
                                cotizacion: 'cotizaciones',
                              }
                              onNavigate?.(map[item.tipo])
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(15,110,86,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <div style={{ fontSize: 18 }}>{item.icono}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 1000,
                                color: '#04342C',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.nombre}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: 20,
                              background: 'rgba(15,110,86,0.12)',
                              color: '#0F6E56',
                              flexShrink: 0,
                            }}
                          >
                            {TYPE_META[item.tipo].label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
              Sin resultados para “{trimmed}”
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

