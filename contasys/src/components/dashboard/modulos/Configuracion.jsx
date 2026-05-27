import { useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import useAuth from '../../../hooks/useAuth'
import useEmpresa from '../../../hooks/useEmpresa'

function normalizeText(v) {
  return String(v ?? '').trim()
}

export default function Configuracion() {
  const { session } = useAuth()
  const { empresa, loading: loadingEmpresa } = useEmpresa()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const userId = session?.user?.id

  const [empresaForm, setEmpresaForm] = useState({
    nombre_empresa: '',
    nit: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    moneda: 'COP',
  })

  const [perfilForm, setPerfilForm] = useState({
    name: '',
    email: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  })

  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')

        if (!userId) return

        if (empresa && mounted) {
          setEmpresaForm({
            nombre_empresa: empresa.nombre_empresa ?? '',
            nit: empresa.nit ?? '',
            telefono: empresa.telefono ?? '',
            direccion: empresa.direccion ?? '',
            ciudad: empresa.ciudad ?? '',
            moneda: empresa.moneda ?? 'COP',
          })
        }

        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('name,email')
          .eq('id', userId)
          .maybeSingle()

        if (pErr) throw pErr

        if (!mounted) return

        setPerfilForm({
          name: profile?.name ?? '',
          email: profile?.email ?? session?.user?.email ?? '',
        })
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Error cargando configuración')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [userId, empresa, session?.user?.email])

  async function saveEmpresa(e) {
    e?.preventDefault()
    if (!empresa?.id) return

    setSavingEmpresa(true)
    setError('')
    try {
      const payload = {
        nombre_empresa: normalizeText(empresaForm.nombre_empresa),
        nit: normalizeText(empresaForm.nit) || null,
        telefono: normalizeText(empresaForm.telefono) || null,
        direccion: normalizeText(empresaForm.direccion) || null,
        ciudad: normalizeText(empresaForm.ciudad) || null,
        moneda: normalizeText(empresaForm.moneda) || 'COP',
      }

      const { error: err } = await supabase
        .from('empresas')
        .update(payload)
        .eq('id', empresa.id)

      if (err) throw err
    } catch (e) {
      setError(e?.message || 'Error guardando empresa')
    } finally {
      setSavingEmpresa(false)
    }
  }

  async function savePerfil(e) {
    e?.preventDefault()
    if (!userId) return

    setSavingPerfil(true)
    setError('')
    try {
      const next = {
        name: normalizeText(perfilForm.name),
      }

      // email se gestiona con updateUser en Supabase Auth; pero aquí solo persistimos profile.name
      const { error: err } = await supabase
        .from('profiles')
        .update(next)
        .eq('id', userId)

      if (err) throw err

      // actualizar también tabla profiles.email si viene
      const email = normalizeText(perfilForm.email)
      if (email) {
        const { error: err2 } = await supabase
          .from('profiles')
          .update({ email })
          .eq('id', userId)
        if (err2) throw err2
      }
    } catch (e) {
      setError(e?.message || 'Error guardando perfil')
    } finally {
      setSavingPerfil(false)
    }
  }

  async function savePassword(e) {
    e?.preventDefault()
    if (!userId) return

    setSavingPassword(true)
    setError('')
    try {
      // Nota: Supabase requiere flow adicional para currentPassword (depende del auth provider).
      // Aquí implementamos cambio de contraseña usando updateUser solo con newPassword.
      const newPassword = normalizeText(passwordForm.newPassword)
      if (!newPassword) throw new Error('Nueva contraseña requerida')

      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err

      setPasswordForm({ currentPassword: '', newPassword: '' })
    } catch (e) {
      setError(e?.message || 'Error cambiando contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  async function deleteAccount() {
    // Importante: eliminar cuenta completa requiere endpoint/flow seguro.
    // Implementamos el mínimo: delete del usuario actual mediante auth (si tu configuración lo permite).
    // Si falla por políticas/seguridad, el usuario deberá usar un flujo admin/edge function.

    setDeletingAccount(true)
    setError('')
    try {
      const ok = window.confirm('Confirmación final: esto intentará eliminar tu usuario en Supabase.')
      if (!ok) return

      const { error: err } = await supabase.auth.admin?.deleteUser?.(userId)
      if (err) {
        // fallback: no disponible admin en cliente
        throw err
      }
    } catch (e) {
      // Fallback seguro: si no existe admin/deleteUser desde cliente, mostramos mensaje.
      const msg = e?.message || 'No se pudo eliminar la cuenta desde el cliente. Usa un endpoint seguro.'
      setError(msg)
    } finally {
      setDeletingAccount(false)
      setConfirmDeleteOpen(false)
    }
  }

  if (loadingEmpresa || loading) {
    return <div style={{ marginLeft: 240, padding: 24 }}>Cargando configuración...</div>
  }

  return (
    <div style={{ marginLeft: 240, padding: 24, paddingTop: 92 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 1000, color: '#04342C' }}>Configuración</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.7 }}>Edita empresa, perfil, contraseña y cuenta.</p>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, color: '#b00020', fontWeight: 900 }}>{error}</div>
      ) : null}

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        {/* Empresa */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Editar datos de la empresa</div>

          <form onSubmit={saveEmpresa} style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Nombre empresa</span>
                <input
                  value={empresaForm.nombre_empresa}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, nombre_empresa: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>NIT</span>
                <input
                  value={empresaForm.nit}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, nit: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Teléfono</span>
                <input
                  value={empresaForm.telefono}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, telefono: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Moneda</span>
                <input
                  value={empresaForm.moneda}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, moneda: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Dirección</span>
                <input
                  value={empresaForm.direccion}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, direccion: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Ciudad</span>
                <input
                  value={empresaForm.ciudad}
                  onChange={(e) => setEmpresaForm((f) => ({ ...f, ciudad: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingEmpresa}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
              <button type="submit" disabled={savingEmpresa} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}>
                {savingEmpresa ? 'Guardando...' : 'Guardar empresa'}
              </button>
            </div>
          </form>
        </div>

        {/* Perfil usuario */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Editar perfil del usuario</div>

          <form onSubmit={savePerfil} style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Nombre</span>
                <input
                  value={perfilForm.name}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, name: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingPerfil}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Email</span>
                <input
                  value={perfilForm.email}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingPerfil}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
              <button type="submit" disabled={savingPerfil} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}>
                {savingPerfil ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </form>
        </div>

        {/* Contraseña */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 900, color: '#04342C' }}>Cambiar contraseña</div>

          <form onSubmit={savePassword} style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Contraseña actual</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', padding: '0 12px' }}
                  disabled={savingPassword}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 900, opacity: 0.8 }}>Nueva contraseña</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, border: `1px solid ${passwordForm.newPassword ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.12)'}`, padding: '0 12px' }}

                  disabled={savingPassword}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
              <button type="submit" disabled={savingPassword} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(15,110,86,.45)', background: '#0F6E56', color: '#fff', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}>
                {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>

        {/* Zona de peligro */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,.04)' }}>
          <div style={{ fontWeight: 1000, color: '#b00020' }}>Zona de peligro</div>
          <p style={{ marginTop: 6, opacity: 0.75, fontWeight: 800 }}>Eliminar mi cuenta (requiere configuración segura en backend).</p>

          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            style={{
              marginTop: 12,
              height: 46,
              borderRadius: 12,
              border: '1px solid rgba(255,107,107,.45)',
              background: 'rgba(255,107,107,.12)',
              color: '#b00020',
              padding: '0 16px',
              cursor: 'pointer',
              fontWeight: 1000,
            }}
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      {confirmDeleteOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 150,
          }}
          onClick={() => {
            if (!deletingAccount) setConfirmDeleteOpen(false)
          }}
        >
          <div
            style={{
              width: 'min(680px, 100%)',
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
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1000, color: '#b00020' }}>Confirmar eliminación</h3>
                <p style={{ margin: '6px 0 0', opacity: 0.75, fontWeight: 900 }}>
                  Esto intentará eliminar tu cuenta desde el cliente. Si tu proyecto no permite esto, necesitarás un endpoint seguro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                style={{ height: 40, width: 40, borderRadius: 12, border: '1px solid rgba(0,0,0,.10)', background: '#fff', cursor: 'pointer', fontWeight: 1000 }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setConfirmDeleteOpen(false)} disabled={deletingAccount} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', padding: '0 14px', cursor: 'pointer', fontWeight: 1000 }}>
                Cancelar
              </button>
              <button type="button" onClick={deleteAccount} disabled={deletingAccount} style={{ height: 44, borderRadius: 12, border: '1px solid rgba(255,107,107,.45)', background: 'rgba(255,107,107,.12)', color: '#b00020', padding: '0 18px', cursor: 'pointer', fontWeight: 1000 }}>
                {deletingAccount ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

