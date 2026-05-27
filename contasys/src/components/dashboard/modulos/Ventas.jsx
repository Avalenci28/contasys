import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'
import { SkeletonTable } from '../../ui/Skeleton'

const IVA_DEFAULT = 19


function formatMoney(value, currency = 'COP') {
  const v = Number(value ?? 0)
  try {
    return v.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 })
  } catch {
    return String(v)
  }
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function calcLineSubtotal(cantidad, precioUnitario) {
  return toNumber(cantidad) * toNumber(precioUnitario)
}

export default function Ventas({ addToast }) {
  const safeToast = addToast || (() => {})
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [estado, setEstado] = useState('')

  const [ventas, setVentas] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cliente_id: null,
    fecha: new Date().toISOString().slice(0, 16),
    notas: '',
    impuestoPorc: IVA_DEFAULT,
    items: [],
    // productos search
    productoSearch: '',
    productoOptions: [],
    productoSelectedId: null,
  })

  const [clientes, setClientes] = useState([])
  const [inventarioIndex, setInventarioIndex] = useState([]) // para autocomplete
  const [modalErrors, setModalErrors] = useState({})

  const currency = empresa?.moneda || 'COP'

  const itemsTotalSubtotal = useMemo(() => {
    return form.items.reduce((acc, it) => acc + toNumber(it.subtotal), 0)
  }, [form.items])

  const impuestosTotal = useMemo(() => {
    const porc = toNumber(form.impuestoPorc)
    return (itemsTotalSubtotal * porc) / 100
  }, [form.impuestoPorc, itemsTotalSubtotal])

  const descuento = 0
  const total = useMemo(() => {
    return itemsTotalSubtotal - descuento + impuestosTotal
  }, [itemsTotalSubtotal, impuestosTotal])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const base = supabase.from('ventas').select('id, fecha, total, estado, cliente_id')
        if (fechaDesde) base.gte('fecha', new Date(fechaDesde).toISOString())
        if (fechaHasta) base.lt('fecha', new Date(new Date(fechaHasta).setHours(23, 59, 59)).toISOString())
        if (estado) base.eq('estado', estado)
        const { data, error: err } = await base.order('fecha', { ascending: false })
        if (!mounted) return
        if (err) throw err
        setVentas(data ?? [])
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando ventas')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, fechaDesde, fechaHasta, estado])

  useEffect(() => {
    if (!empresaId) return
    if (!modalOpen) return

    let mounted = true
    ;(async () => {
      try {
        setModalErrors({})
        const [{ data: clientesData, error: cErr }, { data: invData, error: iErr }] = await Promise.all([
          supabase.from('clientes').select('id,nombre').eq('empresa_id', empresaId).order('nombre'),
          supabase.from('inventario').select('id,nombre,categoria,precio_venta,stock_actual').eq('empresa_id', empresaId),
        ])
        if (!mounted) return
        if (cErr) throw cErr
        if (iErr) throw iErr
        setClientes(clientesData ?? [])
        setInventarioIndex(invData ?? [])
      } catch (e) {
        if (!mounted) return
        setModalErrors({ _form: e?.message || 'Error preparando la venta' })
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const q = form.productoSearch.trim().toLowerCase()
    if (!q) {
      setForm((f) => ({ ...f, productoOptions: [] }))
      return
    }

    const opts = inventarioIndex
      .filter((p) => {
        const hay = `${p.nombre} ${p.id}`.toLowerCase()
        return hay.includes(q)
      })
      .filter((p) => toNumber(p.stock_actual) > 0)
      .slice(0, 8)

    setForm((f) => ({ ...f, productoOptions: opts }))
  }, [form.productoSearch, inventarioIndex, modalOpen])

  function openNuevaVenta() {
    setModalErrors({})
    setForm({
      cliente_id: null,
      fecha: new Date().toISOString().slice(0, 16),
      notas: '',
      impuestoPorc: IVA_DEFAULT,
      items: [],
      productoSearch: '',
      productoOptions: [],
      productoSelectedId: null,
    })
    setModalOpen(true)
  }

  function addItemFromProducto(productoId) {
    const prod = inventarioIndex.find((p) => p.id === productoId)
    if (!prod) return
    const item = {
      producto_id: prod.id,
      nombre: prod.nombre,
      cantidad: 1,
      precio_unitario: toNumber(prod.precio_venta),
      subtotal: calcLineSubtotal(1, prod.precio_venta),
    }
    setForm((f) => ({ ...f, items: [...f.items, item], productoSearch: '', productoOptions: [], productoSelectedId: null }))
  }

  function updateItem(index, patch) {
    setForm((f) => {
      const next = [...f.items]
      const cur = next[index]
      const cantidad = patch.cantidad !== undefined ? patch.cantidad : cur.cantidad
      const precio_unitario = patch.precio_unitario !== undefined ? patch.precio_unitario : cur.precio_unitario
      const subtotal = calcLineSubtotal(cantidad, precio_unitario)
      next[index] = { ...cur, ...patch, cantidad, precio_unitario, subtotal }
      return { ...f, items: next }
    })
  }

  function removeItem(index) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  }

  async function handleGuardarVenta(e) {
    e.preventDefault()
    if (saving) return

    const nextErrors = {}
    if (!form.cliente_id) nextErrors.cliente_id = 'Selecciona un cliente'
    if (!form.items.length) nextErrors.items = 'Agrega al menos un producto'

    setModalErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      // 1) crear venta
      const { data: ventaData, error: vErr } = await supabase
        .from('ventas')
        .insert({
          empresa_id: empresaId,
          cliente_id: form.cliente_id,
          fecha: new Date(form.fecha).toISOString(),
          subtotal: itemsTotalSubtotal,
          descuento,
          impuesto: impuestosTotal,
          total,
          estado: 'completada',
          notas: form.notas || null,
        })
        .select('id')
        .single()

      if (vErr) throw vErr
      const venta_id = ventaData?.id

      // 2) insertar items + descontar stock
      for (const it of form.items) {
        // descontar stock
        const cantidad = toNumber(it.cantidad)
        const { error: stockErr } = await supabase
          .from('inventario')
          .update({ stock_actual: it.stock_actual_after ?? null })
          .eq('id', it.producto_id)

        // Usamos update por RPC manual: lectura + update segura (sin transacciones en frontend)
        const { data: invRow, error: invErr } = await supabase
          .from('inventario')
          .select('stock_actual')
          .eq('id', it.producto_id)
          .single()

        if (invErr) throw invErr

        const nuevoStock = Math.max(0, toNumber(invRow.stock_actual) - cantidad)
        const { error: updErr } = await supabase
          .from('inventario')
          .update({ stock_actual: nuevoStock })
          .eq('id', it.producto_id)

        if (updErr) throw updErr

        const subtotal = toNumber(it.subtotal)
        const { error: itemErr } = await supabase.from('venta_items').insert({
          venta_id,
          producto_id: it.producto_id,
          cantidad,
          precio_unitario: toNumber(it.precio_unitario),
          subtotal,
        })
        if (itemErr) throw itemErr
      }

      setModalOpen(false)
      safeToast('Venta registrada exitosamente')
      // recargar
      setFechaDesde('')
      setFechaHasta('')
      setEstado('')
    } catch (e) {
      safeToast('Ocurrió un error', 'error')
      setModalErrors({ _form: e?.message || 'Error al guardar la venta' })
    } finally {
      setSaving(false)
      setLoading(true)
      // recarga
      const { data: data2, error: _ } = await supabase.from('ventas').select('id').eq('empresa_id', empresaId)
      void data2
      setLoading(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando ventas...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Ventas</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Registra y gestiona ventas con inventario.</p>
        </div>

        <button
          type="button"
          onClick={openNuevaVenta}
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(15,110,86,.45)',
            background: '#0F6E56',
            color: '#fff',
            fontWeight: 900,
            padding: '0 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Nueva venta
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          background: '#fff',
          borderRadius: 12,
          padding: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,.04)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
          Desde
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
          Hasta
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
          Estado
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
          >
            <option value="">Todos</option>
            <option value="completada">completada</option>
            <option value="pendiente">pendiente</option>
          </select>
        </label>
      </div>

      <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,110,86,.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Estado</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Total</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>

            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                  <SkeletonTable rows={6} cols={4} />
                </td>
              </tr>
            ) : rowsEmpty(ventas) ? (

              <tr>
                <td colSpan={4} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                  No hay ventas.
                </td>
              </tr>
            ) : (
              ventas.map((v, idx) => (
                <tr key={v.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>{v.estado}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(v.total, currency)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {/* detalle luego */}
                    {idx === 0 ? null : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error ? <div style={{ marginTop: 14, color: '#b00020', fontWeight: 900 }}>{error}</div> : null}

      {modalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 120,
          }}
          onClick={() => {
            if (!saving) setModalOpen(false)
          }}
        >
          <div
            style={{
              width: 'min(980px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 18px 60px rgba(0,0,0,.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>Nueva venta</h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 900 }}>Calculamos subtotal + IVA + total automáticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ height: 40, width: 40, borderRadius: 12, border: '1px solid rgba(0,0,0,.10)', background: '#fff', cursor: 'pointer', fontWeight: 1000 }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {modalErrors._form ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalErrors._form}</div> : null}

            <form onSubmit={handleGuardarVenta} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Cliente</span>
                  <select
                    value={form.cliente_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value || null }))}
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={saving}
                  >
                    <option value="">— Selecciona —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {modalErrors.cliente_id ? <span style={{ color: '#b00020', fontWeight: 1000 }}>{modalErrors.cliente_id}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Fecha</span>
                  <input
                    type="datetime-local"
                    value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={saving}
                  />
                </label>
              </div>

              <div style={{ marginTop: 14, background: 'rgba(15,110,86,.05)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 1000, opacity: 0.8 }}>Buscar productos</span>
                      <input
                        value={form.productoSearch}
                        onChange={(e) => setForm((f) => ({ ...f, productoSearch: e.target.value }))}
                        placeholder="Nombre del producto..."
                        style={{ height: 46, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                        disabled={saving}
                      />
                    </label>
                    {form.productoOptions.length ? (
                      <div style={{ marginTop: 10, background: '#fff', border: '1px solid rgba(0,0,0,.10)', borderRadius: 12, overflow: 'hidden' }}>
                        {form.productoOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItemFromProducto(p.id)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              border: 0,
                              background: '#fff',
                              borderBottom: '1px solid rgba(0,0,0,.06)',
                              fontWeight: 900,
                            }}
                            disabled={saving}
                          >
                            {p.nombre} — Stock: {p.stock_actual} — Precio: {formatMoney(p.precio_venta, currency)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <label style={{ width: 220, display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>IVA (%)</span>
                    <input
                      type="number"
                      value={form.impuestoPorc}
                      onChange={(e) => setForm((f) => ({ ...f, impuestoPorc: e.target.value }))}
                      style={{ height: 46, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                      disabled={saving}
                    />
                  </label>
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
                      {form.items.length ? (
                        form.items.map((it, idx) => (
                          <tr key={`${it.producto_id}-${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: 10, fontSize: 13, fontWeight: 900 }}>{it.nombre}</td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right' }}>
                              <input
                                type="number"
                                min={1}
                                value={it.cantidad}
                                onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                                style={{ width: 110, height: 40, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={it.precio_unitario}
                                onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                                style={{ width: 130, height: 40, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                              {formatMoney(it.subtotal, currency)}
                            </td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button type="button" onClick={() => removeItem(idx)} style={{ height: 36, width: 36, borderRadius: 12, border: '1px solid rgba(255,107,107,.35)', background: 'rgba(255,107,107,.10)', cursor: 'pointer', fontWeight: 1000 }} disabled={saving}>
                                🗑
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                            Agrega productos para calcular la venta.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Subtotal</div>
                    <div>{formatMoney(itemsTotalSubtotal, currency)}</div>
                  </div>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>IVA</div>
                    <div>{formatMoney(impuestosTotal, currency)}</div>
                  </div>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Total</div>
                    <div style={{ fontSize: 18 }}>{formatMoney(total, currency)}</div>
                  </div>
                </div>

                {modalErrors.items ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalErrors.items}</div> : null}
              </div>

              <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
                <span style={{ fontWeight: 1000, opacity: 0.8 }}>Notas (opcional)</span>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones para esta venta..."
                  style={{ height: 90, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '10px 12px', resize: 'vertical' }}
                  disabled={saving}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: '0 14px', cursor: 'pointer', fontWeight: 1000 }} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

