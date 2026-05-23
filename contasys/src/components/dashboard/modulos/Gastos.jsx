import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function normalizeText(v) {
  return String(v ?? '').trim()
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value, currency = 'COP') {
  const v = toNumber(value)
  try {
    return v.toLocaleString('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 })
  } catch {
    return String(v)
  }
}

const COLORS = ['#0F6E56', '#0B7286', '#5C7CFA', '#F59E0B', '#EF4444', '#7C3AED', '#10B981', '#3B82F6']

export default function Gastos() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id
  const currency = empresa?.moneda || 'COP'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [queryCategoria, setQueryCategoria] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)

  const [categoriaOptions, setCategoriaOptions] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [editId, setEditId] = useState(null)

  const [form, setForm] = useState({
    descripcion: '',
    categoria: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 16),
    proveedor_id: null,
  })

  const searchCategoriaValue = useMemo(() => queryCategoria.trim(), [queryCategoria])

  const [proveedores, setProveedores] = useState([])

  async function loadProveedores() {
    if (!empresaId) return
    const { data, error: err } = await supabase
      .from('proveedores')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .order('nombre')

    if (err) throw err
    setProveedores(data ?? [])
  }

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      try {
        await loadProveedores()
        if (!mounted) return
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando proveedores')
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const base = supabase
          .from('gastos')
          .select('*', { count: 'exact' })
          .eq('empresa_id', empresaId)

        if (searchCategoriaValue) {
          base.ilike('categoria', `%${searchCategoriaValue}%`)
        }

        if (fechaDesde) {
          base.gte('fecha', new Date(fechaDesde).toISOString())
        }

        if (fechaHasta) {
          base.lt(
            'fecha',
            new Date(new Date(fechaHasta).setHours(23, 59, 59)).toISOString()
          )
        }

        const { data, error: err, count } = await base
          .order('fecha', { ascending: false })

        if (!mounted) return
        if (err) throw err
        setRows(data ?? [])
        setTotal(count ?? (data?.length ?? 0))

        // categorías (para filtros rápidos / gráfica)
        const set = new Set((data ?? []).map((r) => r.categoria).filter(Boolean))
        setCategoriaOptions(Array.from(set).sort((a, b) => a.localeCompare(b)))
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando gastos')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, searchCategoriaValue, fechaDesde, fechaHasta])

  const gastosPorCategoria = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.categoria || 'Sin categoría'
      map.set(key, (map.get(key) ?? 0) + toNumber(r.monto))
    }
    const arr = Array.from(map.entries()).map(([categoria, monto]) => ({ categoria, monto }))
    arr.sort((a, b) => b.monto - a.monto)
    return arr
  }, [rows])

  function openAdd() {
    setFormErrors({})
    setModalMode('add')
    setEditId(null)
    setForm({
      descripcion: '',
      categoria: '',
      monto: 0,
      fecha: new Date().toISOString().slice(0, 16),
      proveedor_id: null,
    })
    setModalOpen(true)
  }

  function openEdit(row) {
    setFormErrors({})
    setModalMode('edit')
    setEditId(row.id)
    setForm({
      descripcion: row.descripcion ?? '',
      categoria: row.categoria ?? '',
      monto: toNumber(row.monto),
      fecha: row.fecha ? new Date(row.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      proveedor_id: row.proveedor_id ?? null,
    })
    setModalOpen(true)
  }

  function validate() {
    const next = {}
    if (!normalizeText(form.descripcion)) next.descripcion = 'La descripción es requerida'
    if (!normalizeText(form.categoria)) next.categoria = 'La categoría es requerida'
    if (toNumber(form.monto) <= 0) next.monto = 'El monto debe ser mayor a 0'
    return next
  }

  async function handleSave(e) {
    e.preventDefault()

    const nextErrors = validate()
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setError('')
    try {
      const payload = {
        empresa_id: empresaId,
        descripcion: normalizeText(form.descripcion),
        categoria: normalizeText(form.categoria),
        monto: toNumber(form.monto),
        fecha: new Date(form.fecha).toISOString(),
        proveedor_id: form.proveedor_id || null,
      }

      if (modalMode === 'add') {
        const { error: err } = await supabase.from('gastos').insert(payload)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('gastos').update(payload).eq('id', editId)
        if (err) throw err
      }

      setModalOpen(false)
      setEditId(null)
      // refrescar
      setCategoriaOptions([])
      // recargar por filtros
      setQueryCategoria('')
      // no forzamos recargar fechas
      setLoading(true)
      const { data, error: err2 } = await supabase
        .from('gastos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('fecha', { ascending: false })
      if (err2) throw err2
      setRows(data ?? [])
      setTotal((data ?? []).length)

    } catch (e) {
      setFormErrors({ _form: e?.message || 'Error guardando gasto' })
    } finally {
      setSaving(false)
      setLoading(false)
    }
  }

  async function handleDelete(row) {
    const ok = window.confirm(`¿Eliminar "${row.descripcion}"?`)
    if (!ok) return

    setSaving(true)
    try {
      const { error: err } = await supabase.from('gastos').delete().eq('id', row.id)
      if (err) throw err
      setLoading(true)
      setQueryCategoria('')
    } catch (e) {
      setError(e?.message || 'Error eliminando gasto')
    } finally {
      setSaving(false)
      setLoading(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando gastos...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Gastos</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Gestiona gastos y visualiza distribución por categoría.</p>
        </div>

        <button
          type="button"
          onClick={openAdd}
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
          + Agregar gasto
        </button>
      </div>

      <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 900, opacity: 0.75, fontSize: 13 }}>
            Categoría
            <input
              value={queryCategoria}
              onChange={(e) => {
                setQueryCategoria(e.target.value)
              }}
              placeholder="Ej: transporte"
              style={{ height: 42, borderRadius: 12, border: '1px solid rgba(4,52,44,.16)', padding: '0 10px' }}
            />
          </label>

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

          <div style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 900 }}>
            {total} registros
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Gastos por categoría</div>
          <div style={{ width: '100%', height: 260, marginTop: 10 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gastosPorCategoria}
                  dataKey="monto"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {gastosPorCategoria.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Resumen</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {gastosPorCategoria.slice(0, 6).map((g, idx) => (
              <div key={g.categoria} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 10, background: COLORS[idx % COLORS.length], display: 'inline-block' }} />
                  <span style={{ fontWeight: 900 }}>{g.categoria}</span>
                </div>
                <div style={{ fontWeight: 1000 }}>{formatMoney(g.monto, currency)}</div>
              </div>
            ))}
            {gastosPorCategoria.length === 0 ? (
              <div style={{ opacity: 0.7, fontWeight: 900 }}>No hay datos para los filtros actuales.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,110,86,.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Descripción</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Categoría</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Monto</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>Cargando...</td>
              </tr>
            ) : rows.length ? (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,.01)', borderTop: '1px solid rgba(0,0,0,.04)' }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.85 }}>
                    {r.fecha ? new Date(r.fecha).toLocaleString('es-CO') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 900 }}>{r.descripcion}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.categoria || <span style={{ opacity: 0.5 }}>—</span>}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>{formatMoney(r.monto, currency)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        style={{
                          height: 34,
                          width: 34,
                          borderRadius: 10,
                          border: '1px solid rgba(4,52,44,.16)',
                          background: 'rgba(4,52,44,.06)',
                          cursor: 'pointer',
                          fontWeight: 1000,
                        }}
                        aria-label="Editar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        style={{
                          height: 34,
                          width: 34,
                          borderRadius: 10,
                          border: '1px solid rgba(255,107,107,.35)',
                          background: 'rgba(255,107,107,.10)',
                          cursor: 'pointer',
                          fontWeight: 1000,
                        }}
                        aria-label="Eliminar"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>No hay gastos para mostrar.</td>
              </tr>
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
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>
                  {modalMode === 'add' ? '+ Agregar gasto' : 'Editar gasto'}
                </h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 900 }}>Completa los datos del gasto.</p>
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

            {formErrors._form ? <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{formErrors._form}</div> : null}

            <form onSubmit={handleSave} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Descripción</span>
                  <input
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    style={{ height: 46, borderRadius: 12, border: `1px solid ${formErrors.descripcion ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={saving}
                  />
                  {formErrors.descripcion ? <span style={{ color: '#b00020', fontWeight: 1000 }}>{formErrors.descripcion}</span> : null}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Categoría</span>
                  <input
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    style={{ height: 46, borderRadius: 12, border: `1px solid ${formErrors.categoria ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={saving}
                  />
                  {formErrors.categoria ? <span style={{ color: '#b00020', fontWeight: 1000 }}>{formErrors.categoria}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Monto</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto}
                    onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                    style={{ height: 46, borderRadius: 12, border: `1px solid ${formErrors.monto ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={saving}
                  />
                  {formErrors.monto ? <span style={{ color: '#b00020', fontWeight: 1000 }}>{formErrors.monto}</span> : null}
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 1000, opacity: 0.8 }}>Proveedor</span>
                  <select
                    value={form.proveedor_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, proveedor_id: e.target.value || null }))}
                    style={{ height: 46, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={saving}
                  >
                    <option value="">—</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

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
                  {saving ? 'Guardando...' : modalMode === 'add' ? 'Crear' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

