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

  create table deudas (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid references empresas(id),
    cliente_id uuid references clientes(id),
    venta_id uuid references ventas(id) null,
    concepto text not null,
    monto_total numeric default 0,
    monto_pagado numeric default 0,
    fecha_deuda timestamptz default now(),
    fecha_vencimiento timestamptz null,
    estado text default 'pendiente', -- pendiente | parcial | pagada | vencida
    notas text,
    created_at timestamptz default now()
  );

  create table deuda_pagos (
    id uuid primary key default gen_random_uuid(),
    deuda_id uuid references deudas(id) on delete cascade,
    monto numeric not null,
    medio_pago text default 'efectivo', -- efectivo | transferencia | tarjeta
    fecha timestamptz default now(),
    notas text
  );
*/

const STATUS_META = {
  pendiente: { label: 'pendiente', color: '#D97706', bg: 'rgba(217,119,6,.10)' },
  parcial: { label: 'parcial', color: '#0b7286', bg: 'rgba(11,114,134,.10)' },
  pagada: { label: 'pagada', color: '#0F6E56', bg: 'rgba(15,110,86,.10)' },
  vencida: { label: 'vencida', color: '#b00020', bg: 'rgba(176,0,32,.10)' },
}

function badgeStyle(estado) {
  const meta = STATUS_META[estado] || STATUS_META.pendiente
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

function rowsEmpty(arr) {
  return !arr || arr.length === 0
}

export default function Deudas() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])
  const [deudas, setDeudas] = useState([])

  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [clienteFiltro, setClienteFiltro] = useState('')

  // Modales
  const [modalDeudaOpen, setModalDeudaOpen] = useState(false)
  const [modalDeudaMode, setModalDeudaMode] = useState('add')
  const [modalDeudaErrors, setModalDeudaErrors] = useState({})
  const [deudaEditId, setDeudaEditId] = useState(null)
  const [deudaSaving, setDeudaSaving] = useState(false)

  const [modalPagoOpen, setModalPagoOpen] = useState(false)
  const [pagoDeudaId, setPagoDeudaId] = useState(null)
  const [modalPagoErrors, setModalPagoErrors] = useState({})
  const [pagoSaving, setPagoSaving] = useState(false)

  const [historialPagos, setHistorialPagos] = useState([])

  const [formDeuda, setFormDeuda] = useState({
    cliente_id: null,
    concepto: '',
    monto_total: 0,
    fecha_vencimiento: '',
    notas: '',
  })

  const [formPago, setFormPago] = useState({
    monto: 0,
    medio_pago: 'efectivo',
    notas: '',
  })

  const currency = 'COP'

  const hoy = useMemo(() => new Date(), [])

  const totalPendiente = useMemo(() => {
    return deudas
      .filter((d) => d.estado !== 'pagada')
      .reduce((acc, d) => acc + toNumber(d.monto_total) - toNumber(d.monto_pagado), 0)
  }, [deudas])

  const clientesConDeuda = useMemo(() => {
    const set = new Set(deudas.filter((d) => d.estado !== 'pagada' && d.cliente_id).map((d) => d.cliente_id))
    return set.size
  }, [deudas])

  const deudasVencidas = useMemo(() => {
    const now = hoy
    return deudas.filter((d) => {
      if (!d.fecha_vencimiento) return false
      const venc = new Date(d.fecha_vencimiento)
      return venc.getTime() < now.getTime() && d.estado !== 'pagada'
    })
  }, [deudas, hoy])

  const recaudadoEsteMes = useMemo(() => {
    // suma pagos del mes actual (deuda_pagos.monto)
    // Para evitar traer todo, calculamos desde cada deuda cargando historialPagos no es ideal.
    // Aquí: si deudas no trae pagos, dejamos 0.
    // Si más adelante agregas select/expand, se actualiza.
    return deudas.reduce((acc, d) => acc + toNumber(d._recaudado_mes ?? 0), 0)
  }, [deudas])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true

    ;(async () => {
      setLoading(true)
      setError('')

      try {
        // 1) actualizar estados vencidos automáticamente
        const nowIso = new Date().toISOString()
        await supabase
          .from('deudas')
          .update({ estado: 'vencida' })
          .lt('fecha_vencimiento', nowIso)
          .neq('estado', 'pagada')

        // 2) cargar clientes
        const { data: clientesData, error: cErr } = await supabase
          .from('clientes')
          .select('id,nombre')
          .eq('empresa_id', empresaId)
          .order('nombre')

        if (cErr) throw cErr

        if (!mounted) return
        setClientes(clientesData ?? [])

        // 3) cargar deudas
        let q = supabase.from('deudas').select('*').eq('empresa_id', empresaId)

        if (estadoFiltro && estadoFiltro !== 'todos') q = q.eq('estado', estadoFiltro)
        if (clienteFiltro) q = q.eq('cliente_id', clienteFiltro)

        // ordenar por vencimiento ascendente (más urgente primero)
        q = q.order('fecha_vencimiento', { ascending: true, nullsFirst: true })

        const { data, error: dErr } = await q
        if (dErr) throw dErr
        if (!mounted) return

        setDeudas(data ?? [])
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando deudas')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, estadoFiltro, clienteFiltro])

  // Recalcular y actualizar estado de cada deuda según monto_pagado
  useEffect(() => {
    // El backend debería manejar, pero para robustez UI:
    setDeudas((prev) =>
      prev.map((d) => {
        const total = toNumber(d.monto_total)
        const pagado = toNumber(d.monto_pagado)
        if (total <= 0) return d
        if (pagado >= total) return { ...d, estado: d.estado === 'vencida' ? 'pagada' : 'pagada' }
        if (pagado > 0 && pagado < total) return { ...d, estado: d.estado === 'vencida' ? 'parcial' : 'parcial' }
        return { ...d, estado: d.estado === 'vencida' ? 'vencida' : 'pendiente' }
      })
    )
  }, [])

  function openCrearDeuda() {
    setModalDeudaMode('add')
    setDeudaEditId(null)
    setModalDeudaErrors({})
    setFormDeuda({
      cliente_id: null,
      concepto: '',
      monto_total: 0,
      fecha_vencimiento: '',
      notas: '',
    })
    setModalDeudaOpen(true)
  }

  async function openRegistrarPago(deuda) {
    setPagoDeudaId(deuda.id)
    setModalPagoErrors({})
    setModalPagoOpen(true)
    setHistorialPagos([])
    setFormPago({ monto: 0, medio_pago: 'efectivo', notas: '' })

    try {
      const { data: pagos, error: pErr } = await supabase
        .from('deuda_pagos')
        .select('id,monto,medio_pago,fecha,notas')
        .eq('deuda_id', deuda.id)
        .order('fecha', { ascending: false })

      if (pErr) throw pErr
      setHistorialPagos(pagos ?? [])
    } catch (e) {
      setModalPagoErrors({ _form: e?.message || 'Error cargando historial de pagos' })
    }
  }

  function pendienteSaldo(deuda) {
    return Math.max(0, toNumber(deuda.monto_total) - toNumber(deuda.monto_pagado))
  }

  const deudaSeleccionada = useMemo(() => {
    if (!pagoDeudaId) return null
    return deudas.find((d) => d.id === pagoDeudaId) || null
  }, [pagoDeudaId, deudas])

  async function actualizarEstadosPago(deudaId) {
    // estado según monto_pagado y vencer
    const { data: deudaRow, error: dErr } = await supabase.from('deudas').select('monto_total,monto_pagado,estado,fecha_vencimiento').eq('id', deudaId).single()
    if (dErr) throw dErr

    const total = toNumber(deudaRow?.monto_total)
    const pagado = toNumber(deudaRow?.monto_pagado)

    let nuevoEstado = 'pendiente'
    if (pagado >= total && total > 0) nuevoEstado = 'pagada'
    else if (pagado > 0 && pagado < total) nuevoEstado = 'parcial'
    else nuevoEstado = 'pendiente'

    const venc = deudaRow?.fecha_vencimiento ? new Date(deudaRow.fecha_vencimiento) : null
    if (nuevoEstado !== 'pagada' && venc && venc.getTime() < new Date().getTime()) {
      nuevoEstado = 'vencida'
    }

    const { error: uErr } = await supabase.from('deudas').update({ estado: nuevoEstado }).eq('id', deudaId)
    if (uErr) throw uErr

    return nuevoEstado
  }

  async function handleGuardarDeuda(e) {
    e.preventDefault()
    if (deudaSaving) return

    setModalDeudaErrors({})
    const nextErrors = {}
    if (!formDeuda.cliente_id) nextErrors.cliente_id = 'Selecciona un cliente'
    if (!formDeuda.concepto.trim()) nextErrors.concepto = 'Concepto es requerido'
    if (!(toNumber(formDeuda.monto_total) > 0)) nextErrors.monto_total = 'Monto total es requerido'

    setModalDeudaErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setDeudaSaving(true)
    try {
      const payload = {
        empresa_id: empresaId,
        cliente_id: formDeuda.cliente_id,
        concepto: formDeuda.concepto.trim(),
        monto_total: toNumber(formDeuda.monto_total),
        monto_pagado: 0,
        fecha_vencimiento: formDeuda.fecha_vencimiento ? new Date(formDeuda.fecha_vencimiento).toISOString() : null,
        estado: 'pendiente',
        notas: formDeuda.notas || null,
      }

      let { error: insErr } = await supabase.from('deudas').insert(payload)
      if (insErr) throw insErr

      setModalDeudaOpen(false)
      // recargar
      setEstadoFiltro((s) => s)
    } catch (e) {
      setModalDeudaErrors({ _form: e?.message || 'Error guardando deuda' })
    } finally {
      setDeudaSaving(false)
    }
  }

  async function handleRegistrarPago(e) {
    e.preventDefault()
    if (pagoSaving) return
    setModalPagoErrors({})

    if (!pagoDeudaId) return

    const nextErrors = {}
    const saldo = pendienteSaldo(deudaSeleccionada)

    const montoNuevo = toNumber(formPago.monto)
    if (!(montoNuevo > 0)) nextErrors.monto = 'Monto es requerido'
    if (montoNuevo > saldo) nextErrors.monto = 'El pago no puede exceder el saldo pendiente'
    if (!formPago.medio_pago) nextErrors.medio_pago = 'Selecciona medio de pago'

    setModalPagoErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setPagoSaving(true)
    try {
      // insertar pago
      const { error: pErr } = await supabase.from('deuda_pagos').insert({
        deuda_id: pagoDeudaId,
        monto: montoNuevo,
        medio_pago: formPago.medio_pago,
        notas: formPago.notas || null,
        fecha: new Date().toISOString(),
      })
      if (pErr) throw pErr

      // actualizar monto_pagado
      const { error: uErr } = await supabase
        .from('deudas')
        .update({ monto_pagado: toNumber(deudaSeleccionada?.monto_pagado) + montoNuevo })
        .eq('id', pagoDeudaId)
      if (uErr) throw uErr

      // recalcular estado (pagada/parcial/vencida)
      await actualizarEstadosPago(pagoDeudaId)

      setModalPagoOpen(false)
      // recargar deudas
      setEstadoFiltro((s) => s)
      setClienteFiltro((c) => c)
    } catch (e) {
      setModalPagoErrors({ _form: e?.message || 'Error registrando pago' })
    } finally {
      setPagoSaving(false)
    }
  }

  async function eliminarDeuda(deuda) {
    if (deuda.estado !== 'pendiente') return
    if (toNumber(deuda.monto_pagado) > 0) return

    const ok = window.confirm('¿Eliminar esta deuda?')
    if (!ok) return

    setError('')
    setLoading(true)
    try {
      const { error: dErr } = await supabase.from('deudas').delete().eq('id', deuda.id)
      if (dErr) throw dErr
      setEstadoFiltro((s) => s)
      setClienteFiltro((c) => c)
    } catch (e) {
      setError(e?.message || 'Error eliminando deuda')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando deudas...</div>
  }

  const estadoOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'pendiente' },
    { value: 'parcial', label: 'parcial' },
    { value: 'pagada', label: 'pagada' },
    { value: 'vencida', label: 'vencida' },
  ]

  const totalDeudaPend = totalPendiente

  const totalPagosPorMes = recaudadoEsteMes

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Deudas</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Crédito a clientes: pendientes, pagos y vencimientos.</p>
        </div>

        <button
          type="button"
          onClick={openCrearDeuda}
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
          disabled={loading || deudaSaving || pagoSaving}
        >
          + Nueva deuda
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Deudas pendientes</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6, color: '#04342C' }}>{formatMoney(totalDeudaPend)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Clientes con deuda</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6, color: '#04342C' }}>{clientesConDeuda}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Vencidas</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6, color: '#b00020' }}>{deudasVencidas.length}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Recaudado este mes</div>
          <div style={{ fontWeight: 1000, fontSize: 22, marginTop: 6, color: '#04342C' }}>{formatMoney(totalPagosPorMes)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          marginTop: 14,
          background: '#fff',
          borderRadius: 12,
          padding: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 1000, opacity: 0.75, fontSize: 13 }}>
          Estado
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
          >
            {estadoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6, fontWeight: 1000, opacity: 0.75, fontSize: 13 }}>
          Cliente
          <select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px', minWidth: 220 }}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: 'auto', fontWeight: 1000, opacity: 0.7 }}>
          {deudas.length} deudas
        </div>
      </div>

      {/* Listado */}
      <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,110,86,.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Concepto</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Deuda total</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Pagado</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Saldo</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Vencimiento</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Estado</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                  Cargando...
                </td>
              </tr>
            ) : rowsEmpty(deudas) ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, opacity: 0.7, fontWeight: 1000 }}>
                  No hay deudas.
                </td>
              </tr>
            ) : (
              deudas.map((d) => {
                const saldo = pendienteSaldo(d)
                const total = toNumber(d.monto_total)
                const pagado = toNumber(d.monto_pagado)
                const pct = total > 0 ? Math.round((pagado / total) * 100) : 0
                const clienteNombre = clientes.find((c) => c.id === d.cliente_id)?.nombre || (d.cliente_id ? 'Cliente' : '—')

                const isVencida = d.estado === 'vencida'

                return (
                  <tr key={d.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)', background: isVencida ? 'rgba(176,0,32,.04)' : '#fff' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>{clienteNombre}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000 }}>{d.concepto || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(d.monto_total)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(d.monto_pagado)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ color: saldo > 0 ? isVencida ? '#b00020' : '#04342C' : '#0F6E56' }}>{formatMoney(saldo)}</div>
                        <div style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#0F6E56', borderRadius: 999 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 1000, color: isVencida ? '#b00020' : 'inherit' }}>
                      {d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={badgeStyle(d.estado)}>{d.estado}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openRegistrarPago(d)}
                          style={{
                            height: 34,
                            padding: '0 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(4,52,44,.16)',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 1000,
                          }}
                          disabled={saving || saldo <= 0}
                        >
                          Registrar pago
                        </button>

                        {d.estado === 'pendiente' && toNumber(d.monto_pagado) === 0 ? (
                          <button
                            type="button"
                            onClick={() => eliminarDeuda(d)}
                            style={{
                              height: 34,
                              width: 40,
                              borderRadius: 12,
                              border: '1px solid rgba(255,107,107,.35)',
                              background: 'rgba(255,107,107,.10)',
                              cursor: 'pointer',
                              fontWeight: 1000,
                            }}
                            aria-label="Eliminar"
                            disabled={saving}
                          >
                            🗑️
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {error ? <div style={{ marginTop: 14, color: '#b00020', fontWeight: 1000 }}>{error}</div> : null}

      {/* Modal Crear/Agregar Deuda */}
      {modalDeudaOpen ? (
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
            if (!deudaSaving) setModalDeudaOpen(false)
          }}
        >
          <div
            style={{
              width: 'min(860px, 100%)',
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
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>+ {modalDeudaMode === 'add' ? 'Crear deuda' : 'Editar deuda'}</h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 900 }}>Registra una deuda en estado pendiente.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalDeudaOpen(false)}
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

            {modalDeudaErrors._form ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalDeudaErrors._form}</div> : null}

            <form onSubmit={handleGuardarDeuda} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Cliente</span>
                  <select
                    value={formDeuda.cliente_id ?? ''}
                    onChange={(e) => setFormDeuda((f) => ({ ...f, cliente_id: e.target.value || null }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                    disabled={deudaSaving}
                  >
                    <option value="">— Selecciona —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {modalDeudaErrors.cliente_id ? <span style={{ color: '#b00020', fontWeight: 900 }}>{modalDeudaErrors.cliente_id}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Monto total</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formDeuda.monto_total}
                    onChange={(e) => setFormDeuda((f) => ({ ...f, monto_total: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                    disabled={deudaSaving}
                  />
                  {modalDeudaErrors.monto_total ? <span style={{ color: '#b00020', fontWeight: 900 }}>{modalDeudaErrors.monto_total}</span> : null}
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Fecha vencimiento (opcional)</span>
                  <input
                    type="date"
                    value={formDeuda.fecha_vencimiento}
                    onChange={(e) => setFormDeuda((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                    disabled={deudaSaving}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Concepto</span>
                  <input
                    value={formDeuda.concepto}
                    onChange={(e) => setFormDeuda((f) => ({ ...f, concepto: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                    disabled={deudaSaving}
                  />
                  {modalDeudaErrors.concepto ? <span style={{ color: '#b00020', fontWeight: 900 }}>{modalDeudaErrors.concepto}</span> : null}
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Notas</span>
                  <textarea
                    value={formDeuda.notas}
                    onChange={(e) => setFormDeuda((f) => ({ ...f, notas: e.target.value }))}
                    placeholder="Opcional..."
                    style={{ height: 90, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '10px 12px', resize: 'vertical' }}
                    disabled={deudaSaving}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setModalDeudaOpen(false)}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: '0 14px', cursor: 'pointer', fontWeight: 1000 }}
                  disabled={deudaSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}
                  disabled={deudaSaving}
                >
                  {deudaSaving ? 'Guardando...' : 'Guardar deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal Registrar pago */}
      {modalPagoOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 130,
          }}
          onClick={() => {
            if (!pagoSaving) setModalPagoOpen(false)
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>Registrar pago</h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 900 }}>
                  Saldo pendiente: {formatMoney(pendienteSaldo(deudaSeleccionada))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagoOpen(false)}
                style={{ height: 40, width: 40, borderRadius: 12, border: '1px solid rgba(0,0,0,.10)', background: '#fff', cursor: 'pointer', fontWeight: 1000 }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {modalPagoErrors._form ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{modalPagoErrors._form}</div> : null}

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <form onSubmit={handleRegistrarPago} style={{ background: 'rgba(15,110,86,.05)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 1000, color: '#04342C' }}>Pago</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 900, opacity: 0.8 }}>Monto</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formPago.monto}
                      onChange={(e) => setFormPago((f) => ({ ...f, monto: e.target.value }))}
                      style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={pagoSaving}
                    />
                    {modalPagoErrors.monto ? <span style={{ color: '#b00020', fontWeight: 900 }}>{modalPagoErrors.monto}</span> : null}
                  </label>

                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 900, opacity: 0.8 }}>Medio de pago</span>
                    <select
                      value={formPago.medio_pago}
                      onChange={(e) => setFormPago((f) => ({ ...f, medio_pago: e.target.value }))}
                      style={{ height: 44, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 12px' }}
                      disabled={pagoSaving}
                    >
                      <option value="efectivo">efectivo</option>
                      <option value="transferencia">transferencia</option>
                      <option value="tarjeta">tarjeta</option>
                    </select>
                    {modalPagoErrors.medio_pago ? <span style={{ color: '#b00020', fontWeight: 900 }}>{modalPagoErrors.medio_pago}</span> : null}
                  </label>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 900, opacity: 0.8 }}>Notas (opcional)</span>
                    <textarea
                      value={formPago.notas}
                      onChange={(e) => setFormPago((f) => ({ ...f, notas: e.target.value }))}
                      placeholder="Opcional..."
                      style={{ height: 90, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '10px 12px', resize: 'vertical' }}
                      disabled={pagoSaving}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setModalPagoOpen(false)}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: '0 14px', cursor: 'pointer', fontWeight: 1000 }}
                    disabled={pagoSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}
                    disabled={pagoSaving}
                  >
                    {pagoSaving ? 'Guardando...' : 'Registrar pago'}
                  </button>
                </div>
              </form>

              <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid rgba(4,52,44,.10)' }}>
                <div style={{ fontWeight: 1000, color: '#04342C' }}>Historial de pagos</div>

                <div style={{ marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15,110,86,.06)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, opacity: 0.7 }}>Fecha</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 12, opacity: 0.7 }}>Medio</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 12, opacity: 0.7 }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsEmpty(historialPagos) ? (
                        <tr>
                          <td colSpan={3} style={{ padding: 12, opacity: 0.7, fontWeight: 1000 }}>
                            Sin pagos anteriores.
                          </td>
                        </tr>
                      ) : (
                        historialPagos.map((p) => (
                          <tr key={p.id} style={{ borderTop: '1px solid rgba(0,0,0,.06)' }}>
                            <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 1000 }}>
                              {p.fecha ? new Date(p.fecha).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 1000 }}>{p.medio_pago || '—'}</td>
                            <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                              {formatMoney(p.monto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {historialPagos.length ? (
                  <div style={{ marginTop: 10, opacity: 0.7, fontWeight: 900, fontSize: 12 }}>
                    Los pagos se muestran en orden descendente por fecha.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

