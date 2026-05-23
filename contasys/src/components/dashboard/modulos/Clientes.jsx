import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import useEmpresa from '../../../hooks/useEmpresa'

function normalizeText(v) {
  return String(v ?? '').trim()
}

function toLower(v) {
  return normalizeText(v).toLowerCase()
}

export default function Clientes() {
  const { empresa, loading: loadingEmpresa } = useEmpresa()
  const empresaId = empresa?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // add | edit
  const [formErrors, setFormErrors] = useState({})
  const [editId, setEditId] = useState(null)

  const [form, setForm] = useState({
    nombre: '',
    tipo_documento: 'CC',
    numero_documento: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
  })

  const searchValue = useMemo(() => query.trim(), [query])

  useEffect(() => {
    if (!empresaId) return

    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const base = supabase
          .from('clientes')
          .select('*', { count: 'exact' })
          .eq('empresa_id', empresaId)

        if (searchValue) {
          base.or(
            `nombre.ilike.%${searchValue}%,numero_documento.ilike.%${searchValue}%`
          )
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
        setError(e?.message || 'Error cargando clientes')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [empresaId, searchValue, page])

  function openAdd() {
    setFormErrors({})
    setModalMode('add')
    setEditId(null)
    setForm({
      nombre: '',
      tipo_documento: 'CC',
      numero_documento: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
    })
    setModalOpen(true)
  }

  function openEdit(row) {
    setFormErrors({})
    setModalMode('edit')
    setEditId(row.id)
    setForm({
      nombre: row.nombre ?? '',
      tipo_documento: row.tipo_documento ?? 'CC',
      numero_documento: row.numero_documento ?? '',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
      direccion: row.direccion ?? '',
      ciudad: row.ciudad ?? '',
    })
    setModalOpen(true)
  }

  function validate() {
    const next = {}
    if (!normalizeText(form.nombre)) next.nombre = 'El nombre es requerido'
    if (!normalizeText(form.numero_documento)) {
      next.numero_documento = 'El número de documento es requerido'
    }
    if (normalizeText(form.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Email inválido'
    }
    return next
  }

  async function handleSave(e) {
    e.preventDefault()

    const nextErrors = validate()
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      const payload = {
        empresa_id: empresaId,
        nombre: normalizeText(form.nombre),
        tipo_documento: normalizeText(form.tipo_documento) || null,
        numero_documento: normalizeText(form.numero_documento),
        email: normalizeText(form.email) || null,
        telefono: normalizeText(form.telefono) || null,
        direccion: normalizeText(form.direccion) || null,
        ciudad: normalizeText(form.ciudad) || null,
      }

      if (modalMode === 'add') {
        const { error: err } = await supabase.from('clientes').insert(payload)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', editId)
        if (err) throw err
      }

      setModalOpen(false)
      setEditId(null)
      setPage(1)
      setQuery('')
    } catch (e) {
      setFormErrors({ _form: e?.message || 'Error guardando cliente' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(row) {
    const ok = window.confirm(`¿Eliminar "${row.nombre}"?`)
    if (!ok) return

    setLoading(true)
    try {
      const { error: err } = await supabase.from('clientes').delete().eq('id', row.id)
      if (err) throw err
      setPage(1)
    } catch (e) {
      setError(e?.message || 'Error eliminando cliente')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEmpresa) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando clientes...</div>
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Clientes</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Gestiona tu base de clientes.</p>
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
          + Agregar cliente
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
          placeholder="Buscar por nombre o documento"
          style={{
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(4,52,44,.16)',
            background: '#fff',
            padding: '0 14px',
            minWidth: 320,
          }}
        />

        <div style={{ marginLeft: 'auto', opacity: 0.7, fontWeight: 800 }}>{total} registros</div>
      </div>

      <div style={{ marginTop: 14, background: '#fff', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,110,86,.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Documento</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Ciudad</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                  Cargando...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,.01)',
                    borderTop: '1px solid rgba(0,0,0,.04)',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 900 }}>{r.nombre}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, opacity: 0.85 }}>
                    {r.tipo_documento ? `${r.tipo_documento}: ` : ''}
                    {r.numero_documento}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.email || <span style={{ opacity: 0.5 }}>—</span>}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.ciudad || <span style={{ opacity: 0.5 }}>—</span>}</td>
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
                <td colSpan={5} style={{ padding: 16, opacity: 0.7, fontWeight: 900 }}>
                  No hay clientes para mostrar.
                </td>
              </tr>
            )}
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
        <div style={{ marginTop: 14, color: '#b00020', fontWeight: 900 }}>{error}</div>
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
                  {modalMode === 'add' ? '+ Agregar cliente' : 'Editar cliente'}
                </h3>
                <p style={{ margin: '6px 0 0', opacity: 0.7, fontWeight: 800 }}>Completa los datos del cliente.</p>
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
              <div style={{ marginTop: 12, color: '#b00020', fontWeight: 1000 }}>{formErrors._form}</div>
            ) : null}

            <form onSubmit={handleSave} style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Nombre</span>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${formErrors.nombre ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`,
                      padding: '0 12px',
                    }}
                    disabled={loading}
                  />
                  {formErrors.nombre ? (
                    <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.nombre}</span>
                  ) : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Tipo documento</span>
                  <input
                    value={form.tipo_documento}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Número documento</span>
                  <input
                    value={form.numero_documento}
                    onChange={(e) => setForm((f) => ({ ...f, numero_documento: e.target.value }))}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${formErrors.numero_documento ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`,
                      padding: '0 12px',
                    }}
                    disabled={loading}
                  />
                  {formErrors.numero_documento ? (
                    <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.numero_documento}</span>
                  ) : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Ciudad</span>
                  <input
                    value={form.ciudad}
                    onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Email</span>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${formErrors.email ? '#ff6b6b' : 'rgba(0,0,0,.12)'}`,
                      padding: '0 12px',
                    }}
                    disabled={loading}
                  />
                  {formErrors.email ? <span style={{ color: '#b00020', fontWeight: 900 }}>{formErrors.email}</span> : null}
                </label>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Teléfono</span>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 900, opacity: 0.8 }}>Dirección</span>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                    disabled={loading}
                  />
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

