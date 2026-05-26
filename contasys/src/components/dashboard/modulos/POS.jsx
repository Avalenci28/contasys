import { useEffect, useMemo, useState } from 'react'
import useEmpresa from '../../../hooks/useEmpresa'
import { supabase } from '../../../supabaseClient'

function formatMoney(value) {
  const v = Number(value ?? 0)
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

const IVA_OPTS = [0, 5, 19]

export default function POS() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])

  const [inventario, setInventario] = useState([])
  const [productoSearch, setProductoSearch] = useState('')
  const [productoOptions, setProductoOptions] = useState([])

  const [carrito, setCarrito] = useState([]) // {producto_id,nombre,cantidad,precio_unitario,subtotal}

  const [clienteId, setClienteId] = useState(null)

  const [impuestoPorc, setImpuestoPorc] = useState(19)

  const [mediosPago, setMediosPago] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null) // {totalCobrado,cambioEfectivo}

  const currency = 'COP'

  const itemsSubtotal = useMemo(() => {
    return carrito.reduce((acc, it) => acc + toNumber(it.subtotal), 0)
  }, [carrito])

  const impuesto = useMemo(() => {
    const porc = toNumber(impuestoPorc)
    return (itemsSubtotal * porc) / 100
  }, [impuestoPorc, itemsSubtotal])

  const total = useMemo(() => {
    return itemsSubtotal + impuesto
  }, [itemsSubtotal, impuesto])

  const totalPagos = useMemo(() => {
    return toNumber(mediosPago.efectivo) + toNumber(mediosPago.transferencia) + toNumber(mediosPago.tarjeta)
  }, [mediosPago])

  const falta = useMemo(() => {
    return Math.max(0, toNumber(total) - toNumber(totalPagos))
  }, [total, totalPagos])

  const cambioEfectivo = useMemo(() => {
    const ef = toNumber(mediosPago.efectivo)
    return Math.max(0, ef - toNumber(total))
  }, [mediosPago.efectivo, total])

  // Cargar clientes + inventario
  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: clientesData, error: cErr }, { data: invData, error: iErr }] = await Promise.all([
          supabase.from('clientes').select('id,nombre').eq('empresa_id', empresaId).order('nombre'),
          supabase
            .from('inventario')
            .select('id,nombre,categoria,precio_venta,stock_actual')
            .eq('empresa_id', empresaId)
            .order('nombre'),
        ])

        if (!mounted) return
        if (cErr) throw cErr
        if (iErr) throw iErr

        setClientes(clientesData ?? [])
        setInventario(invData ?? [])
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando POS')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId])

  // Autocomplete búsqueda (tiempo real) con stock>0
  useEffect(() => {
    if (!productoSearch.trim()) {
      setProductoOptions([])
      return
    }

    const q = productoSearch.trim().toLowerCase()
    const opts = inventario
      .filter((p) => toNumber(p.stock_actual) > 0)
      .filter((p) => {
        const hay = `${p.nombre} ${p.id}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)

    setProductoOptions(opts)
  }, [productoSearch, inventario])

  function addProducto(producto) {
    if (!producto) return
    const prodId = producto.id

    setCarrito((prev) => {
      const idx = prev.findIndex((x) => x.producto_id === prodId)
      if (idx >= 0) {
        const next = [...prev]
        const cur = next[idx]
        const cantidad = toNumber(cur.cantidad) + 1
        const precio_unitario = toNumber(cur.precio_unitario)
        next[idx] = { ...cur, cantidad, subtotal: cantidad * precio_unitario }
        return next
      }

      const precio_unitario = toNumber(producto.precio_venta)
      return [
        ...prev,
        {
          producto_id: prodId,
          nombre: producto.nombre,
          cantidad: 1,
          precio_unitario,
          subtotal: precio_unitario * 1,
        },
      ]
    })

    setProductoSearch('')
    setProductoOptions([])
  }

  function updateLinea(index, patch) {
    setCarrito((prev) => {
      const next = [...prev]
      const cur = next[index]
      const cantidad = patch.cantidad !== undefined ? toNumber(patch.cantidad) : toNumber(cur.cantidad)
      const precio_unitario = patch.precio_unitario !== undefined ? toNumber(patch.precio_unitario) : toNumber(cur.precio_unitario)
      next[index] = {
        ...cur,
        cantidad,
        precio_unitario,
        subtotal: cantidad * precio_unitario,
      }
      return next
    })
  }

  function removeLinea(index) {
    setCarrito((prev) => prev.filter((_, i) => i !== index))
  }

  function resetTodo() {
    setCarrito([])
    setClienteId(null)
    setImpuestoPorc(19)
    setMediosPago({ efectivo: 0, transferencia: 0, tarjeta: 0 })
    setSuccess(null)
    setProductoSearch('')
    setProductoOptions([])
    setError('')
  }

  async function handleCobrar() {
    if (!empresaId) return
    if (saving) return

    setError('')

    if (!carrito.length) {
      setError('Agrega productos para cobrar.')
      return
    }

    // Validación de stock local (rápida)
    for (const it of carrito) {
      const inv = inventario.find((p) => p.id === it.producto_id)
      const stock = toNumber(inv?.stock_actual)
      if (it.cantidad > stock) {
        setError(`Stock insuficiente para: ${it.nombre}`)
        return
      }
    }

    if (toNumber(totalPagos) < toNumber(total)) {
      setError('El total de medios de pago no alcanza el total a pagar.')
      return
    }

    setSaving(true)
    try {
      const now = new Date()

      const notas = `Medios de pago - Efectivo: ${formatMoney(mediosPago.efectivo)} | Transferencia: ${formatMoney(
        mediosPago.transferencia
      )} | Tarjeta: ${formatMoney(mediosPago.tarjeta)}`

      // 1) Insert venta
      const { data: ventaData, error: vErr } = await supabase
        .from('ventas')
        .insert({
          empresa_id: empresaId,
          cliente_id: clienteId,
          fecha: now.toISOString(),
          subtotal: itemsSubtotal,
          descuento: 0,
          impuesto,
          total,
          estado: 'completada',
          notas: notas || null,
        })
        .select('id')
        .single()

      if (vErr) throw vErr
      const venta_id = ventaData?.id

      // 2) Insert items + descontar stock
      for (const it of carrito) {
        const cantidad = toNumber(it.cantidad)
        const precio_unitario = toNumber(it.precio_unitario)
        const subtotal = toNumber(it.subtotal)

        const invRow = inventario.find((p) => p.id === it.producto_id)
        const stockActual = toNumber(invRow?.stock_actual)
        const nuevoStock = Math.max(0, stockActual - cantidad)

        const { error: updStockErr } = await supabase
          .from('inventario')
          .update({ stock_actual: nuevoStock })
          .eq('id', it.producto_id)

        if (updStockErr) throw updStockErr

        const { error: insItemErr } = await supabase.from('venta_items').insert({
          venta_id,
          producto_id: it.producto_id,
          cantidad,
          precio_unitario,
          subtotal,
        })

        if (insItemErr) throw insItemErr
      }

      // actualizar inventario local
      setInventario((prev) =>
        prev.map((p) => {
          const found = carrito.find((x) => x.producto_id === p.id)
          if (!found) return p
          const stockActual = toNumber(p.stock_actual)
          return { ...p, stock_actual: Math.max(0, stockActual - toNumber(found.cantidad)) }
        })
      )

      setSuccess({ totalCobrado: totalPagos, cambioEfectivo })
      setCarrito([])
      setMediosPago({ efectivo: 0, transferencia: 0, tarjeta: 0 })
      setClienteId(null)
      setImpuestoPorc(19)
      setProductoSearch('')
      setProductoOptions([])
    } catch (e) {
      setError(e?.message || 'Error al cobrar')
    } finally {
      setSaving(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando POS...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Punto de Venta (POS)</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Caja rápida con inventario, IVA y pagos mixtos.</p>
        </div>

        <button
          type="button"
          onClick={resetTodo}
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(15,110,86,.45)',
            background: '#fff',
            color: '#0F6E56',
            fontWeight: 1000,
            padding: '0 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Nueva venta
        </button>
      </div>

      {loading ? (
        <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          Cargando POS...
        </div>
      ) : (
        <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          {error ? <div style={{ color: '#b00020', fontWeight: 1000, marginBottom: 10 }}>{error}</div> : null}

          {success ? (
            <div
              style={{
                background: 'rgba(15,110,86,.06)',
                border: '1px solid rgba(15,110,86,.25)',
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 1000, color: '#04342C', fontSize: 16 }}>✅ Venta completada</div>
                <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 1000 }}>
                  Total cobrado: {formatMoney(success.totalCobrado)}
                </div>
                <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 1000 }}>
                  Cambio (efectivo): {formatMoney(success.cambioEfectivo)}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => resetTodo()}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(15,110,86,.45)',
                    background: '#0F6E56',
                    color: '#fff',
                    fontWeight: 1000,
                    padding: '0 18px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Nueva venta
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .9fr', gap: 14, marginTop: success ? 14 : 0, alignItems: 'start' }}>
            {/* Columna izquierda: búsqueda + carrito + pagos */}
            <div>
              {/* Búsqueda */}
              <div style={{ background: 'rgba(15,110,86,.05)', borderRadius: 12, padding: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Buscar productos</span>
                  <input
                    value={productoSearch}
                    onChange={(e) => setProductoSearch(e.target.value)}
                    placeholder="Nombre del producto..."
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px', width: '100%' }}
                    disabled={saving}
                  />
                </label>

                {productoOptions.length ? (
                  <div style={{ marginTop: 10, background: '#fff', border: '1px solid rgba(0,0,0,.10)', borderRadius: 12, overflow: 'hidden' }}>
                    {productoOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProducto(p)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          border: 0,
                          background: '#fff',
                          borderBottom: '1px solid rgba(0,0,0,.06)',
                          fontWeight: 1000,
                        }}
                        disabled={saving}
                      >
                        {p.nombre} — Stock: {p.stock_actual} — Precio: {formatMoney(p.precio_venta)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Selector cliente + tabla carrito */}
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>Cliente</span>
                    <select
                      value={clienteId ?? 'general'}
                      onChange={(e) => setClienteId(e.target.value === 'general' ? null : e.target.value)}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={saving}
                    >
                      <option value="general">Cliente general</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ opacity: 0.7, fontWeight: 1000, textAlign: 'right' }}>
                    {carrito.length ? `Ítems: ${carrito.length}` : 'Agrega productos'}
                  </div>
                </div>

                <div style={{ marginTop: 12, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15,110,86,.08)' }}>
                        <th style={{ textAlign: 'left', padding: 10, fontSize: 12, opacity: 0.7 }}>Producto</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Cantidad</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Precio</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Subtotal</th>
                        <th style={{ textAlign: 'center', padding: 10, fontSize: 12, opacity: 0.7 }}>—</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.length ? (
                        carrito.map((it, idx) => (
                          <tr key={`${it.producto_id}-${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: 10, fontSize: 13, fontWeight: 1000 }}>{it.nombre}</td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right' }}>
                              <input
                                type="number"
                                min={1}
                                value={it.cantidad}
                                onChange={(e) => updateLinea(idx, { cantidad: e.target.value })}
                                style={{ width: 110, height: 40, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={it.precio_unitario}
                                onChange={(e) => updateLinea(idx, { precio_unitario: e.target.value })}
                                style={{ width: 130, height: 40, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(it.subtotal)}</td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeLinea(idx)}
                                style={{
                                  height: 36,
                                  width: 36,
                                  borderRadius: 12,
                                  border: '1px solid rgba(255,107,107,.35)',
                                  background: 'rgba(255,107,107,.10)',
                                  cursor: 'pointer',
                                  fontWeight: 1000,
                                }}
                                disabled={saving}
                                aria-label="Eliminar"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                            {loadingEmpresa ? 'Cargando...' : 'Agrega productos para la venta.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagos mixtos */}
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 1000, color: '#04342C' }}>Pagos mixtos</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>Efectivo</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={mediosPago.efectivo}
                      onChange={(e) => setMediosPago((m) => ({ ...m, efectivo: e.target.value }))}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={saving}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>Transferencia</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={mediosPago.transferencia}
                      onChange={(e) => setMediosPago((m) => ({ ...m, transferencia: e.target.value }))}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={saving}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>Tarjeta</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={mediosPago.tarjeta}
                      onChange={(e) => setMediosPago((m) => ({ ...m, tarjeta: e.target.value }))}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={saving}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Total pagos</div>
                    <div>{formatMoney(totalPagos)}</div>
                  </div>

                  <div style={{ fontWeight: 1000, textAlign: 'right' }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Estado del pago</div>
                    <div style={{ color: falta > 0 ? '#b00020' : '#0F6E56' }}>
                      {falta > 0 ? `Falta: ${formatMoney(falta)}` : `Listo ✅ Cambio: ${formatMoney(cambioEfectivo)}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={resetTodo}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid rgba(4,52,44,.16)',
                      background: '#fff',
                      padding: '0 14px',
                      cursor: 'pointer',
                      fontWeight: 1000,
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleCobrar}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid rgba(15,110,86,.45)',
                      background: '#0F6E56',
                      color: '#fff',
                      padding: '0 18px',
                      cursor: 'pointer',
                      fontWeight: 1000,
                      opacity: saving ? 0.7 : 1,
                    }}
                    disabled={saving || !carrito.length}
                  >
                    {saving ? 'Procesando...' : 'COBRAR'}
                  </button>
                </div>
              </div>
            </div>

            {/* Columna derecha: resumen de cobro */}
            <div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid rgba(4,52,44,.08)' }}>
                <div style={{ fontWeight: 1000, color: '#04342C' }}>Resumen de cobro</div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75 }}>Subtotal</div>
                    <div>{formatMoney(itemsSubtotal)}</div>
                  </div>

                  <label style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                    <div style={{ fontWeight: 1000, opacity: 0.8 }}>IVA (%)</div>
                    <select
                      value={impuestoPorc}
                      onChange={(e) => setImpuestoPorc(parseInt(e.target.value, 10))}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={saving}
                    >
                      {IVA_OPTS.map((x) => (
                        <option key={x} value={x}>
                          {x}%
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75 }}>Impuesto</div>
                    <div>{formatMoney(impuesto)}</div>
                  </div>

                  <div style={{ height: 1, background: 'rgba(0,0,0,.06)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ opacity: 0.75, fontWeight: 1000 }}>Total a pagar</div>
                    <div style={{ fontSize: 20, fontWeight: 1000, color: '#04342C' }}>{formatMoney(total)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, background: 'rgba(15,110,86,.05)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 1000, color: '#04342C' }}>Tips</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, opacity: 0.8, fontWeight: 900, lineHeight: 1.6 }}>
                      <li>
                      Solo se listan productos con <b>stock_actual > 0</b>.
                    </li>
                    <li>
                      Si el efectivo excede el total, el sistema calcula el <b>cambio</b>.
                    </li>
                    <li>COBRAR valida que total pagos ≥ total.</li>
                  </ul>
                </div>
              </div>

              {/* Tabla rápida carrito (mini resumen) */}
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 1000, color: '#04342C' }}>Detalle rápido</div>

                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {rowsEmpty(carrito) ? (
                    <div style={{ opacity: 0.7, fontWeight: 1000 }}>Sin ítems.</div>
                  ) : (
                    carrito.slice(0, 6).map((it, i) => (
                      <div key={`${it.producto_id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 1000, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                          {it.nombre}
                        </div>
                        <div style={{ fontWeight: 1000 }}>
                          {it.cantidad} × {formatMoney(it.precio_unitario)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

