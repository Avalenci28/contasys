import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function formatMoney(value) {
  const v = Number(value ?? 0)
  try {
    return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
  } catch {
    return String(v)
  }
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function Inventario({ addToast }) {
  const safeToast = addToast || (() => {})
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [categoria, setCategoria] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // add | edit
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    codigo_barras: '',
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 5,
    unidad_medida: 'unidad',
    proveedor_id: null,
  })

  const [formErrors, setFormErrors] = useState({})

  const categorias = useMemo(() => {
    // catálogo simple desde el estado; si luego quieres catálogo real, lo cargamos por consulta
    const set = new Set(rows.map((r) => r.categoria).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const base = supabase.from('inventario').select('*', { count: 'exact' }).eq('empresa_id', empresaId)

        const q = query.trim()
        if (categoria) {
          base.eq('categoria', categoria)
        }

        if (q) {
          base.or(`nombre.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
        }

        const from = (page - 1) * pageSize

        const { data, error: err, count } = await base
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)

        if (!mounted) return
        if (err) throw err
        setRows(data ?? [])
        setTotal(count ?? 0)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando inventario')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, categoria, query, page])

  async function loadProveedores() {
    if (!empresaId) return []
    const { data, error } = await supabase
      .from('proveedores')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .order('nombre')

    if (error) throw error
    return data ?? []
  }

  async function openAdd() {
    setFormErrors({})
    setModalMode('add')
    setForm({
      nombre: '',
      categoria: '',
      codigo_barras: '',
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      unidad_medida: 'unidad',
      proveedor_id: null,
    })
    setModalOpen(true)
  }

  async function openEdit(row) {
    setFormErrors({})
    setModalMode('edit')
    setForm({
      nombre: row.nombre ?? '',
      categoria: row.categoria ?? '',
      codigo_barras: row.codigo_barras ?? '',
      precio_compra: toNumber(row.precio_compra),
      precio_venta: toNumber(row.precio_venta),
      stock_actual: toNumber(row.stock_actual),
      stock_minimo: toNumber(row.stock_minimo),
      unidad_medida: row.unidad_medida ?? 'unidad',
      proveedor_id: row.proveedor_id ?? null,
    })
    setModalOpen(true)

    // guardamos id en dataset del input (rápido) mediante closure
    setEditId(row.id)
  }

  const [editId, setEditId] = useState(null)

  function validate() {
    const next = {}
    if (!form.nombre.trim()) next.nombre = 'El nombre es requerido'
    if (!form.stock_minimo && form.stock_minimo !== 0) next.stock_minimo = 'Stock mínimo es requerido'
    if (toNumber(form.stock_actual) < 0) next.stock_actual = 'Stock actual no puede ser negativo'
    if (toNumber(form.precio_compra) < 0) next.precio_compra = 'Precio compra inválido'
    if (toNumber(form.precio_venta) < 0) next.precio_venta = 'Precio venta inválido'
    return next
  }

  async function handleSave(e) {
    e.preventDefault()
    if (modalMode === 'edit' && !editId) return

    const nextErrors = validate()
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      const payload = {
        empresa_id: empresaId,
        nombre: form.nombre.trim(),
        categoria: form.categoria?.trim() || null,
        codigo_barras: form.codigo_barras?.trim() || null,
        precio_compra: toNumber(form.precio_compra),
        precio_venta: toNumber(form.precio_venta),
        stock_actual: Math.floor(toNumber(form.stock_actual)),
        stock_minimo: Math.floor(toNumber(form.stock_minimo)),
        unidad_medida: form.unidad_medida || 'unidad',
        proveedor_id: form.proveedor_id || null,
      }

      if (modalMode === 'add') {
        const { error: err } = await supabase.from('inventario').insert(payload)
        if (err) throw err
        safeToast('Producto creado exitosamente')
      } else {
        const { error: err } = await supabase.from('inventario').update(payload).eq('id', editId)
        if (err) throw err
        safeToast('Producto actualizado')
      }

      setModalOpen(false)
      setEditId(null)

      setPage(1)
      setCategoria('')
      setQuery('')
    } catch (e) {
      setFormErrors({ _form: e?.message || 'Error guardando producto' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(row) {
    const ok = window.confirm(`¿Eliminar "${row.nombre}"?`)
    if (!ok) return

    setLoading(true)
    try {
      const { error: err } = await supabase.from('inventario').delete().eq('id', row.id)
      if (err) throw err

      setPage(1)
    } catch (e) {
      setError(e?.message || 'Error eliminando producto')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando inventario...</div>
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Inventario</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Gestiona tus productos, stock y precios.</p>
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
          + Agregar producto
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
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nombre o código"
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(4,52,44,.16)',
            background: '#fff',
            padding: '0 14px',
            minWidth: 320,
          }}
        />

        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value)
            setPage(1)
          }}
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(4,52,44,.16)',
            background: '#fff',
            padding: '0 14px',
            minWidth: 220,
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 800 }}>
          {total} registros
        </div>
      </div>

      <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,110,86,.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Código</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Categoría</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Stock</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Precio compra</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Precio venta</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const critical = Number(r.stock_actual ?? 0) <= Number(r.stock_minimo ?? 0)
              return (
                <tr
                  key={r.id}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,.01)',
                    borderTop: '1px solid rgba(0,0,0,.04)',
                    color: critical ? '#b00020' : 'inherit',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    {r.codigo_barras || <span style={{ opacity: 0.5 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 900 }}>{r.nombre}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.8 }}>{r.categoria || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 1000 }}>
                    {r.stock_actual} 
                    <span style={{ fontWeight: 700, opacity: 0.7 }}>{r.unidad_medida ? r.unidad_medida : ''}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{formatMoney(r.precio_compra)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{formatMoney(r.precio_venta)}</td>
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
                    {critical ? (
                      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 1000 }}>
                        Stock bajo (≤ {r.stock_minimo})
                      </div>
                    ) : null}
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16, opacity: 0.7, fontWeight: 800 }}>
                  No hay productos para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <div style={{ opacity: 0.7, fontWeight: 800 }}>
          Página {page} de {totalPages}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 12,
              border: '1px solid rgba(4,52,44,.16)',
              background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 12,
              border: '1px solid rgba(4,52,44,.16)',
              background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, color: '#b00020', fontWeight: 900 }}>
          {error}
        </div>
      ) : null}

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
            zIndex: 100,
          }}
          onClick={() => {
            if (!loading) setModalOpen(false)
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
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#04342C' }}>
                  {modalMode === 'add' ? '+ Agregar producto' : 'Editar producto'}
                </h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 800 }}>Completa los datos del producto.</p>
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

            {formErrors._form ? (
              <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>
                {formErrors._form}
              </div>
            ) : null}

            <form onSubmit={handleSave} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Nombre</span>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: `1px solid ${formErrors.nombre ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={loading}
                  />
                  {formErrors.nombre ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.nombre}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Categoría</span>
                  <input
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Código de barras</span>
                  <input
                    value={form.codigo_barras}
                    onChange={(e) => setForm((f) => ({ ...f, codigo_barras: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Unidad de medida</span>
                  <input
                    value={form.unidad_medida}
                    onChange={(e) => setForm((f) => ({ ...f, unidad_medida: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Precio compra</span>
                  <input
                    value={form.precio_compra}
                    onChange={(e) => setForm((f) => ({ ...f, precio_compra: e.target.value }))}
                    type="number"
                    step="0.01"
                    style={{ height: 44, borderRadius: 12, border: `1px solid ${formErrors.precio_compra ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={loading}
                  />
                  {formErrors.precio_compra ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.precio_compra}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Precio venta</span>
                  <input
                    value={form.precio_venta}
                    onChange={(e) => setForm((f) => ({ ...f, precio_venta: e.target.value }))}
                    type="number"
                    step="0.01"
                    style={{ height: 44, borderRadius: 12, border: `1px solid ${formErrors.precio_venta ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={loading}
                  />
                  {formErrors.precio_venta ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.precio_venta}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Proveedor (opcional)</span>
                  <select
                    value={form.proveedor_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, proveedor_id: e.target.value || null }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  >
                    <option value="">—</option>
                    {/* simple: se rellenará en el futuro; por ahora, lo dejamos vacío */}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Stock actual</span>
                  <input
                    value={form.stock_actual}
                    onChange={(e) => setForm((f) => ({ ...f, stock_actual: e.target.value }))}
                    type="number"
                    style={{ height: 44, borderRadius: 12, border: `1px solid ${formErrors.stock_actual ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={loading}
                  />
                  {formErrors.stock_actual ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.stock_actual}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Stock mínimo</span>
                  <input
                    value={form.stock_minimo}
                    onChange={(e) => setForm((f) => ({ ...f, stock_minimo: e.target.value }))}
                    type="number"
                    style={{ height: 44, borderRadius: 12, border: `1px solid ${formErrors.stock_minimo ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}
                    disabled={loading}
                  />
                  {formErrors.stock_minimo ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.stock_minimo}</span> : null}
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,.12)',
                    background: '#fff',
                    padding: '0 14px',
                    cursor: 'pointer',
                    fontWeight: 1000,
                  }}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(15,110,86,.45)',
                    background: '#0F6E56',
                    color: '#fff',
                    padding: '0 18px',
                    cursor: 'pointer',
                    fontWeight: 1000,
                  }}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : modalMode === 'add' ? 'Crear' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

