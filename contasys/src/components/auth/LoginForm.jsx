import { useMemo, useState } from 'react'
import styles from './LoginForm.module.css'
import { supabase } from '../../supabaseClient'

function isValidEmail(value) {
  return /.+@.+\..+/.test(value)
}

function getErrorMessage(err) {
  const msg = err?.message || 'Error al iniciar sesión'
  // Supabase errors often include English messages; keep them but prepend friendly context.
  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu email y contraseña.'
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Tu correo no está confirmado. Revisa tu bandeja de entrada.'
  }
  return msg
}

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => {
    return !loading
  }, [loading])

  async function handleResetPassword() {
    const e = email.trim()
    if (!e) {
      setErrors({ email: 'Ingresa tu email para recuperar la contraseña.' })
      return
    }
    if (!isValidEmail(e)) {
      setErrors({ email: 'Email inválido. Revisa e inténtalo nuevamente.' })
      return
    }

    try {
      setErrors({})
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: window.location.origin + '/',
      })
      if (error) throw error
      alert('Revisa tu correo. Te enviamos un enlace para restablecer la contraseña.')
    } catch (err) {
      const msg = getErrorMessage(err)
      alert(msg)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    const nextErrors = {}

    if (!email.trim()) nextErrors.email = 'Email es requerido'
    else if (!isValidEmail(email)) nextErrors.email = 'Email inválido'

    if (!password.trim()) nextErrors.password = 'Contraseña es requerida'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error

      // Supabase no tiene "remember me" por defecto como tal; mantenemos el comportamiento como UX.
      // Si quisieras persistencia con localStorage, se maneja vía auth settings.
      onSuccess?.()
    } catch (err) {
      const msg = getErrorMessage(err)
      setErrors({ _form: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.logo}>ContaSys</div>

        <h1 className={styles.title}>Bienvenido de vuelta</h1>
        <p className={styles.subtitle}>Ingresa tus datos para acceder a tu sistema contable</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {errors._form ? (
            <div className={styles.errorBox} role="alert">
              <span className={styles.errorIcon} aria-hidden="true">
                !
              </span>
              <span>{errors._form}</span>
            </div>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <span className={styles.inputWrap}>
              <span className={styles.icon} aria-hidden="true">
                ✉️
              </span>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="correo@empresa.com"
                disabled={loading}
              />
            </span>
            {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Contraseña</span>
            <span className={styles.inputWrap}>
              <span className={styles.icon} aria-hidden="true">
                🔒
              </span>
              <input
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </span>
            {errors.password ? <span className={styles.fieldError}>{errors.password}</span> : null}
          </label>

          <div className={styles.row}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Recordarme</span>
            </label>

            <button
              type="button"
              className={styles.link}
              onClick={handleResetPassword}
              disabled={loading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {loading ? (
              <span className={styles.loading}>
                <span className={styles.spinner} aria-hidden="true" />
                Verificando...
              </span>
            ) : (
              'Entrar al sistema'
            )}
          </button>

          <button
            type="button"
            className={styles.switchLink}
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            ¿No tienes cuenta? <strong>Regístrate gratis</strong>
          </button>
        </form>

        <div className={styles.fadeIn} />
      </div>
    </div>
  )
}

