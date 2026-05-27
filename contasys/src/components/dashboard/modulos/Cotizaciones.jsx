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

/*
  SQL para ejecutar en Supabase:

  create table cotizaciones (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid references empresas(id),
    cliente_id uuid references clientes(id),
    fecha timestamptz default now(),
    validez_dias int default 30,
    estado text default 'borrador', -- borrador | enviada | aceptada | rechazada | convertida
    subtotal numeric default 0,
    impuesto numeric default 0,
    total numeric default 0,
    notas text,
    created_at timestamptz default now()
  );

  create table cotizacion_items (
    id uuid primary key default gen_random_uuid(),
    cotizacion_id uuid references cotizaciones(id) on delete cascade,
    producto_id uuid references inventario(id),
    descripcion text,
    cantidad numeric default 1,
    precio_unitario numeric default 0,
    subtotal numeric default 0
  );
*/

const IVA_OPTS = [0, 5, 19]

const STATUS_META = {
  borrador: { label: 'borrador', color: 'rgba(0,0,0,.45)', bg: 'rgba(0,0,0,.05)' },
  enviada: { label: 'enviada', color: '#0b7286', bg: 'rgba(11,114,134,.10)' },
  aceptada: { label: 'aceptada', color: '#0F6E56', bg: 'rgba(15,110,86,.10)' },
  rechazada: { label: 'rechazada', color: '#b00020', bg: 'rgba(176,0,32,.10)' },
  convertida: { label: 'convertida', color: '#6B21A8', bg: 'rgba(107,33,168,.10)' },
}

function badgeStyle(estado) {
  const meta = STATUS_META[estado] || STATUS_META.borrador
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    background: meta.bg,
    border: `1px solid ${meta.bg}`,
    color: meta.color,
    fontWeight: 1000,
    fontSize: 12,
    whiteSpace: 'nowrap',
  }
}

function datePlusDays(iso, days) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    d.setDate(d.getDate() + toNumber(days))
    return d.toLocaleDateString('es-CO')
  } catch {
    return ''
  }
}

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

export default function Cotizaciones() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [cotizaciones, setCotizaciones] = useState([])
  const [clientesMap, setClientesMap] = useState(new Map())

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // add | edit
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalErrors, setModalErrors] = useState({})

  const [inventario, setInventario] = useState([])
  const [clientes, setClientes] = useState([])

  const [search, setSearch] = useState('')
  const [productoOptions, setProductoOptions] = useState([])

  const [form, setForm] = useState({
    cliente_id: null,
    validez_dias: 30,
    impuestoPorc: 19,
    items: [],
    notas: '',
    fecha: new Date().toISOString().slice(0, 16),
  })

  const itemsSubtotal = useMemo(() => {
    return form.items.reduce((acc, it) => acc + toNumber(it.subtotal), 0)
  }, [form.items])

  const impuesto = useMemo(() => {
    const porc = toNumber(form.impuestoPorc)
    return (itemsSubtotal * porc) / 100
  }, [form.impuestoPorc, itemsSubtotal])

  const total = useMemo(() => {
    return itemsSubtotal + impuesto
  }, [itemsSubtotal, impuesto])

  const currency = 'COP'

  useEffect(() => {
    if (!empresaId) return

    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')

        let q = supabase
          .from('cotizaciones')
          .select('id, fecha, validez_dias, estado, subtotal, impuesto, total, notas, cliente_id')
          .eq('empresa_id', empresaId)

        if (estadoFiltro) q = q.eq('estado', estadoFiltro)

        const { data, error: err } = await q.order('fecha', { ascending: false })
        if (!mounted) return
        if (err) throw err

        setCotizaciones(data ?? [])

        // join clientes (para nombre)
        const clienteIds = Array.from(new Set((data ?? []).map((x) => x.cliente_id).filter(Boolean)))
        if (!clienteIds.length) {
          setClientesMap(new Map())
          return
        }

        const { data: clientesData, error: cErr } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('empresa_id', empresaId)
          .in('id', clienteIds)

        if (cErr) throw cErr

        const map = new Map()
        for (const c of clientesData ?? []) map.set(c.id, c.nombre)
        setClientesMap(map)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando cotizaciones')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, estadoFiltro])

  async function loadModalData() {
    const [{ data: clientesData, error: cErr }, { data: invData, error: iErr }] = await Promise.all([
      supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId).order('nombre'),
      supabase
        .from('inventario')
        .select('id, nombre, categoria, precio_venta, stock_actual')
        .eq('empresa_id', empresaId),
    ])

    if (cErr) throw cErr
    if (iErr) throw iErr

    setClientes(clientesData ?? [])
    setInventario(invData ?? [])
  }

  function openNuevaCotizacion() {
    setModalErrors({})
    setModalMode('add')
    setEditId(null)
    setSearch('')
    setProductoOptions([])
    setForm({
      cliente_id: null,
      validez_dias: 30,
      impuestoPorc: 19,
      items: [],
      notas: '',
      fecha: new Date().toISOString().slice(0, 16),
    })
    setModalOpen(true)
    void (async () => {
      await loadModalData()
    })()
  }

  function openEditarCotizacion(cot) {
    setModalErrors({})
    setModalMode('edit')
    setEditId(cot.id)
    setSearch('')
    setProductoOptions([])

    void (async () => {
      await loadModalData()

      const { data: itemsData, error: iErr } = await supabase
        .from('cotizacion_items')
        .select('producto_id, descripcion, cantidad, precio_unitario, subtotal')
        .eq('cotizacion_id', cot.id)
        .order('created_at', { ascending: true })

      if (iErr) throw iErr

      setForm({
        cliente_id: cot.cliente_id ?? null,
        validez_dias: toNumber(cot.validez_dias) || 30,
        impuestoPorc: 19, // recalculado visualmente por nosotros
        items: (itemsData ?? []).map((it) => ({
          producto_id: it.producto_id,
          descripcion: it.descripcion ?? '',
          cantidad: toNumber(it.cantidad),
          precio_unitario: toNumber(it.precio_unitario),
          subtotal: toNumber(it.subtotal),
        })),
        notas: cot.notas ?? '',
        fecha: cot.fecha ? new Date(cot.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      })

      // inferir impuestoPorc desde subtotal/impuesto si existiera
      const s = toNumber(cot.subtotal)
      const i = toNumber(cot.impuesto)
      const inferred = s > 0 ? Math.round((i / s) * 100) : 19
      if (IVA_OPTS.includes(inferred)) {
        setForm((f) => ({ ...f, impuestoPorc: inferred }))
      }

      setModalOpen(true)
    })().catch((e) => setModalErrors({ _form: e?.message || 'Error preparando cotización' }))
  }

  // búsqueda de productos dentro del modal (stock >= 0)
  useEffect(() => {
    if (!modalOpen) return
    if (!search.trim()) {
      setProductoOptions([])
      return
    }

    const q = search.trim().toLowerCase()
    const opts = inventario
      .filter((p) => toNumber(p.stock_actual) >= 0)
      .filter((p) => `${p.nombre} ${p.id}`.toLowerCase().includes(q))
      .slice(0, 8)

    setProductoOptions(opts)
  }, [search, inventario, modalOpen])

  function addItemFromProducto(p) {
    setForm((f) => {
      const idx = f.items.findIndex((it) => it.producto_id === p.id && it.descripcion === (p.nombre ?? ''))
      if (idx >= 0) {
        const next = [...f.items]
        const cur = next[idx]
        const cantidad = toNumber(cur.cantidad) + 1
        const precio_unitario = toNumber(cur.precio_unitario)
        next[idx] = { ...cur, cantidad, subtotal: cantidad * precio_unitario }
        return { ...f, items: next }
      }

      const precio_unitario = toNumber(p.precio_venta)
      return {
        ...f,
        items: [
          ...f.items,
          {
            producto_id: p.id,
            descripcion: p.nombre ?? '',
            cantidad: 1,
            precio_unitario,
            subtotal: precio_unitario,
          },
        ],
      }
    })

    setSearch('')
    setProductoOptions([])
  }

  function updateItem(idx, patch) {
    setForm((f) => {
      const next = [...f.items]
      const cur = next[idx]
      const cantidad = patch.cantidad !== undefined ? toNumber(patch.cantidad) : toNumber(cur.cantidad)
      const precio_unitario = patch.precio_unitario !== undefined ? toNumber(patch.precio_unitario) : toNumber(cur.precio_unitario)
      const descripcion = patch.descripcion !== undefined ? patch.descripcion : cur.descripcion
      next[idx] = {
        ...cur,
        descripcion,
        cantidad,
        precio_unitario,
        subtotal: cantidad * precio_unitario,
      }
      return { ...f, items: next }
    })
  }

  function removeItem(idx) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  function validateModal() {
    const next = {}
    if (!form.cliente_id) next.cliente_id = 'Selecciona un cliente'
    if (!form.items.length) next.items = 'Agrega al menos un producto'
    if (!toNumber(form.validez_dias)) next.validez_dias = 'Validez es requerida'
    if (!IVA_OPTS.includes(toNumber(form.impuestoPorc))) next.impuestoPorc = 'IVA inválido'
    return next
  }

  async function handleGuardarCotizacion(e) {
    e.preventDefault()
    if (saving) return

    const nextErrors = validateModal()
    setModalErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    try {
      const payload = {
        empresa_id: empresaId,
        cliente_id: form.cliente_id,
        validez_dias: Math.floor(toNumber(form.validez_dias)),
        fecha: form.fecha ? new Date(form.fecha).toISOString() : new Date().toISOString(),
        estado: 'borrador',
        subtotal: itemsSubtotal,
        impuesto,
        total,
        notas: form.notas || null,
      }

      let cotizacionId = editId

      if (modalMode === 'add') {
        const { data: ins, error: iErr } = await supabase
          .from('cotizaciones')
          .insert(payload)
          .select('id')
          .single()
        if (iErr) throw iErr
        cotizacionId = ins?.id
      } else {
        const { error: uErr } = await supabase.from('cotizaciones').update(payload).eq('id', editId)
        if (uErr) throw uErr

        const { error: delItemsErr } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', editId)
        if (delItemsErr) throw delItemsErr
      }

      for (const it of form.items) {
        await supabase.from('cotizacion_items').insert({
          cotizacion_id: cotizacionId,
          producto_id: it.producto_id,
          descripcion: it.descripcion,
          cantidad: toNumber(it.cantidad),
          precio_unitario: toNumber(it.precio_unitario),
          subtotal: toNumber(it.subtotal),
        })
      }

      setModalOpen(false)
      setEstadoFiltro('')
    } catch (e) {
      setModalErrors({ _form: e?.message || 'Error guardando cotización' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarEstado(cotId, nuevoEstado) {
    setError('')
    setSaving(true)
    try {
      const { error: uErr } = await supabase.from('cotizaciones').update({ estado: nuevoEstado }).eq('id', cotId)
      if (uErr) throw uErr

      setModalOpen(false)
      // recarga lista
      setEstadoFiltro('')
      setCotizaciones((prev) => prev.map((x) => (x.id === cotId ? { ...x, estado: nuevoEstado } : x)))
    } catch (e) {
      setError(e?.message || 'Error cambiando estado')
    } finally {
      setSaving(false)
    }
  }

  async function convertirACotizacionVenta(cot) {
    if (cot.estado !== 'aceptada') return

    setSaving(true)
    setError('')
    try {
      // insertar venta
      const { data: ventaIns, error: vErr } = await supabase
        .from('ventas')
        .insert({
          empresa_id: empresaId,
          cliente_id: cot.cliente_id,
          fecha: new Date().toISOString(),
          subtotal: toNumber(cot.subtotal),
          descuento: 0,
          impuesto: toNumber(cot.impuesto),
          total: toNumber(cot.total),
          estado: 'completada',
          notas: 'Generada desde cotización',
        })
        .select('id')
        .single()

      if (vErr) throw vErr
      const venta_id = ventaIns?.id

      const { data: itemsData, error: itErr } = await supabase
        .from('cotizacion_items')
        .select('producto_id, cantidad, precio_unitario, subtotal, descripcion')
        .eq('cotizacion_id', cot.id)

      if (itErr) throw itErr

      for (const it of itemsData ?? []) {
        await supabase.from('venta_items').insert({
          venta_id,
          producto_id: it.producto_id,
          cantidad: toNumber(it.cantidad),
          precio_unitario: toNumber(it.precio_unitario),
          subtotal: toNumber(it.subtotal),
        })

        const { data: invRow, error: invErr } = await supabase
          .from('inventario')
          .select('stock_actual')
          .eq('id', it.producto_id)
          .single()

        if (invErr) throw invErr

        const nuevoStock = Math.max(0, toNumber(invRow.stock_actual) - toNumber(it.cantidad))
        const { error: updErr } = await supabase.from('inventario').update({ stock_actual: nuevoStock }).eq('id', it.producto_id)
        if (updErr) throw updErr
      }

      const { error: cErr } = await supabase.from('cotizaciones').update({ estado: 'convertida' }).eq('id', cot.id)
      if (cErr) throw cErr

      safeToast('Cotización convertida a venta ✅', 'success')
      setEstadoFiltro('')
    } catch (e) {
      setError(e?.message || 'Error convirtiendo a venta')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarCotizacion(cot) {
    if (cot.estado !== 'borrador') return
    const ok = window.confirm(`¿Eliminar la cotización (${cot.id})?`)
    if (!ok) return

    setSaving(true)
    setError('')
    try {
      const { error: dErr } = await supabase.from('cotizaciones').delete().eq('id', cot.id)
      if (dErr) throw dErr
      setEstadoFiltro('')
    } catch (e) {
      setError(e?.message || 'Error eliminando cotización')
    } finally {
      setSaving(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando cotizaciones...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Cotizaciones</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Presupuestos y conversión a ventas.</p>
        </div>

        <button
          type="button"
          onClick={openNuevaCotizacion}
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(15,110,86,.45)',
            background: '#0F6E56',
            color: '#fff',
            fontWeight: 1000,
            padding: '0 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          disabled={saving}
        >
          + Nueva cotización
        </button>
      </div>

      <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 1000, opacity: 0.75, fontSize: 13 }}>
            Estado
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
            >
              <option value="">Todos</option>
              <option value="borrador">borrador</option>
              <option value="enviada">enviada</option>
              <option value="aceptada">aceptada</option>
              <option value="rechazada">rechazada</option>
              <option value="convertida">convertida</option>
            </select>
          </label>

          <div style={{ opacity: 0.7, fontWeight: 800 }}>
            {cotizaciones.length} cotizaciones
          </div>
        </div>

        {error ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{error}</div> : null}

        <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,110,86,.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Cliente</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Total</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Estado</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Validez</th>
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
              ) : rowsEmpty(cotizaciones) ? (
                <tr>
                  <td colSpan={6} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                    No hay cotizaciones.
                  </td>
                </tr>
              ) : (
                cotizaciones.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {c.fecha ? new Date(c.fecha).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>
                      {c.cliente_id ? clientesMap.get(c.cliente_id) ?? '—' : 'Cliente general'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                      {formatMoney(c.total, currency)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={badgeStyle(c.estado).display ? badgeStyle(c.estado) : badgeStyle(c.estado)}>{c.estado}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {c.fecha ? datePlusDays(c.fecha, c.validez_dias) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditarCotizacion(c)}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(4,52,44,.16)',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 1000,
                          }}
                          disabled={saving}
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(c.id, 'enviada')}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(11,114,134,.35)',
                            background: 'rgba(11,114,134,.10)',
                            cursor: 'pointer',
                            fontWeight: 1000,
                            color: '#0b7286',
                            opacity: c.estado === 'borrador' ? 1 : 0.5,
                          }}
                          disabled={saving || c.estado !== 'borrador'}
                        >
                          Enviar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(c.id, 'aceptada')}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(15,110,86,.35)',
                            background: 'rgba(15,110,86,.10)',
                            cursor: 'pointer',
                            fontWeight: 1000,
                            color: '#0F6E56',
                            opacity: c.estado === 'enviada' ? 1 : 0.5,
                          }}
                          disabled={saving || c.estado !== 'enviada'}
                        >
                          Aceptar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(c.id, 'rechazada')}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(176,0,32,.35)',
                            background: 'rgba(176,0,32,.10)',
                            cursor: 'pointer',
                            fontWeight: 1000,
                            color: '#b00020',
                            opacity: c.estado === 'enviada' ? 1 : 0.5,
                          }}
                          disabled={saving || c.estado !== 'enviada'}
                        >
                          Rechazar
                        </button>

                        <button
                          type="button"
                          onClick={() => convertirACotizacionVenta(c)}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(107,33,168,.35)',
                            background: 'rgba(107,33,168,.10)',
                            cursor: 'pointer',
                            fontWeight: 1000,
                            color: '#6B21A8',
                            opacity: c.estado === 'aceptada' ? 1 : 0.5,
                          }}
                          disabled={saving || c.estado !== 'aceptada'}
                        >
                          Convertir
                        </button>

                        {c.estado === 'borrador' ? (
                          <button
                            type="button"
                            onClick={() => eliminarCotizacion(c)}
                            style={{
                              height: 34,
                              width: 40,
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
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
              width: 'min(1060px, 100%)',
              background: '#fff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 18px 60px rgba(0,0,0,.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>
                  {modalMode === 'add' ? '+ Nueva cotización' : 'Editar cotización'}
                </h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 900 }}>Completa los datos y guardas en borrador.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  height: 40,
                  width: 40,
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

            {modalErrors._form ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalErrors._form}</div> : null}

            <form onSubmit={handleGuardarCotizacion} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Cliente</span>
                  <select
                    value={form.cliente_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value || null }))}
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
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
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Validez (días)</span>
                  <input
                    type="number"
                    min={1}
                    value={form.validez_dias}
                    onChange={(e) => setForm((f) => ({ ...f, validez_dias: e.target.value }))}
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                    disabled={saving}
                  />
                  {modalErrors.validez_dias ? <span style={{ color: '#b00020', fontWeight: 1000 }}>{modalErrors.validez_dias}</span> : null}
                </label>
              </div>

              <div style={{ marginTop: 12, background: 'rgba(15,110,86,.05)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 320 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 1000, opacity: 0.8 }}>Buscar productos</span>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nombre del producto..."
                        style={{ height: 46, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                        disabled={saving}
                      />
                    </label>

                    {productoOptions.length ? (
                      <div style={{ marginTop: 10, background: '#fff', border: '1px solid rgba(0,0,0,.10)', borderRadius: 12, overflow: 'hidden' }}>
                        {productoOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItemFromProducto(p)}
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

                  <label style={{ width: 220, display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 1000, opacity: 0.8 }}>IVA (%)</span>
                    <select
                      value={form.impuestoPorc}
                      onChange={(e) => setForm((f) => ({ ...f, impuestoPorc: e.target.value }))}
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
                </div>

                <div style={{ marginTop: 12, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15,110,86,.08)' }}>
                        <th style={{ textAlign: 'left', padding: 10, fontSize: 12, opacity: 0.7 }}>Descripción</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Cantidad</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Precio</th>
                        <th style={{ textAlign: 'right', padding: 10, fontSize: 12, opacity: 0.7 }}>Subtotal</th>
                        <th style={{ textAlign: 'center', padding: 10, fontSize: 12, opacity: 0.7 }}>—</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.length ? (
                        form.items.map((it, idx) => (
                          <tr key={`${it.producto_id ?? 'x'}-${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: 10, fontSize: 13, fontWeight: 1000 }}>
                              <input
                                value={it.descripcion}
                                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                                style={{ width: 260, height: 40, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                value={it.cantidad}
                                onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
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
                                onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                                style={{ width: 130, height: 40, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
                                disabled={saving}
                              />
                            </td>
                            <td style={{ padding: 10, fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(it.subtotal)}</td>
                            <td style={{ padding: 10, textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
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
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                            Agrega productos para calcular la cotización.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Subtotal</div>
                    <div>{formatMoney(itemsSubtotal)}</div>
                  </div>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>IVA</div>
                    <div>{formatMoney(impuesto)}</div>
                  </div>
                  <div style={{ fontWeight: 1000 }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Total</div>
                    <div style={{ fontSize: 18 }}>{formatMoney(total)}</div>
                  </div>
                </div>

                {modalErrors.items ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalErrors.items}</div> : null}
              </div>

              <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
                <span style={{ fontWeight: 1000, opacity: 0.8 }}>Notas (opcional)</span>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones para esta cotización..."
                  style={{ height: 90, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '10px 12px', resize: 'vertical' }}
                  disabled={saving}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: '0 14px', cursor: 'pointer', fontWeight: 1000 }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

