import { useMemo, useState } from 'react'
import styles from './RegisterForm.module.css'
import { supabase } from '../../supabaseClient'

function isValidEmail(value) {
  return /.+@.+\..+/.test(value)
}

function passwordStrength(pw) {
  // simple heuristics: weak/media/fuerte
  const length = pw.length
  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasNum = /[0-9]/.test(pw)
  const hasSymbol = /[^A-Za-z0-9]/.test(pw)
  const score = [length >= 8, hasLower, hasUpper, hasNum, hasSymbol].filter(Boolean).length
  if (score <= 2) return { label: 'Débil', level: 1 }
  if (score <= 4) return { label: 'Media', level: 2 }
  return { label: 'Fuerte', level: 3 }
}

const PASSWORDS_MIN = 8

const COUNTRIES = [
  'Colombia',
  'Perú',
  'México',
  'Chile',
  'Argentina',
  'Brasil',
  'Venezuela',
  'Ecuador',
  'Bolivia',
  'Uruguay',
  'Paraguay',
  'España',
]

const COMPANY_TYPES = ['Persona Natural', 'SAS', 'S.A.', 'Ltda.', 'Otro']
const SECTORS = [
  'Comercio',
  'Servicios',
  'Manufactura',
  'Construcción',
  'Agropecuario',
  'Tecnología',
  'Salud',
  'Educación',
  'Otro',
]

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'VEF', 'BRL']
const TAX_REGIMES = ['Simplificado', 'Común', 'Gran contribuyente', 'No aplica']
const EMPLOYEE_RANGES = ['1-5', '6-20', '21-50', '51-200', 'Más de 200']
const HOW_KNOWED = ['Recomendación', 'Redes sociales', 'Google', 'Universidad', 'Otro']

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    // Paso 1
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Paso 2
    companyName: '',
    nit: '',
    companyType: 'Persona Natural',
    sectorEconomic: 'Servicios',
    fiscalAddress: '',
    city: '',
    country: 'Colombia',
    phone: '',
    website: '',

    // Paso 3
    currency: 'COP',
    taxRegime: 'Común',
    managesInventory: false,
    managesPayroll: false,
    invoicesElectronically: false,
    numEmployees: '1-5',
    howHeard: 'Recomendación',
    acceptTerms: false,
  })

  const strength = useMemo(() => passwordStrength(form.password), [form.password])

  const progress = [
    { n: 1, label: '① Cuenta' },
    { n: 2, label: '② Empresa' },
    { n: 3, label: '③ Configuración' },
  ]

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validateStep1() {
    const next = {}
    if (!form.fullName.trim()) next.fullName = 'Nombre completo es requerido'
    if (!form.email.trim()) next.email = 'Email es requerido'
    else if (!isValidEmail(form.email)) next.email = 'Email inválido'

    if (!form.password.trim()) next.password = 'Contraseña es requerida'
    else if (form.password.length < PASSWORDS_MIN) next.password = `La contraseña debe tener mínimo ${PASSWORDS_MIN} caracteres`

    if (!form.confirmPassword.trim()) next.confirmPassword = 'Confirmar contraseña es requerida'
    else if (form.password !== form.confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden'

    return next
  }

  function validateStep2() {
    const next = {}
    if (!form.companyName.trim()) next.companyName = 'Nombre de la empresa es requerido'
    if (!form.sectorEconomic) next.sectorEconomic = 'Selecciona el sector económico'
    if (!form.fiscalAddress.trim()) next.fiscalAddress = 'Dirección fiscal es requerida'
    if (!form.city.trim()) next.city = 'Ciudad es requerida'
    if (!form.phone.trim()) next.phone = 'Teléfono de contacto es requerido'
    if (!form.country) next.country = 'País es requerido'
    return next
  }

  function validateStep3() {
    const next = {}
    if (!form.currency) next.currency = 'Moneda principal es requerida'
    if (!form.taxRegime) next.taxRegime = 'Régimen tributario es requerido'
    if (!form.numEmployees) next.numEmployees = 'Selecciona el rango de empleados'
    if (!form.howHeard) next.howHeard = 'Selecciona cómo nos conociste'
    if (!form.acceptTerms) next.acceptTerms = 'Debes aceptar los términos y condiciones'
    return next
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (loading) return

    const nextErrors = {}
    if (step === 1) Object.assign(nextErrors, validateStep1())
    if (step === 2) Object.assign(nextErrors, validateStep2())
    if (step === 3) Object.assign(nextErrors, validateStep3())

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    if (step < 3) {
      setStep((s) => s + 1)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // 1) Crear usuario en auth
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      })
      console.log('signUp data:', JSON.stringify(data, null, 2))
      console.log('signUp error:', error)

      if (error) throw error
      if (!data?.user) {
        console.log('data.user es null - posiblemente confirmación de email requerida')
        throw new Error('No se pudo obtener el usuario: ' + JSON.stringify(data))
      }

      console.log('user id:', data.user.id)
      const userId = data.user.id

      // 2) Insertar en profiles
      const { error: profilesErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: form.fullName.trim(),
          email: form.email.trim(),
          rol: 'usuario',
        })
      if (profilesErr) throw profilesErr

      // 3) Insertar en empresas
      const { error: empresasErr } = await supabase.from('empresas').insert({
        user_id: userId,
        nombre_empresa: form.companyName.trim(),
        nit: form.nit?.trim() || null,
        tipo_empresa: form.companyType,
        sector_economico: form.sectorEconomic,
        direccion: form.fiscalAddress.trim(),
        ciudad: form.city.trim(),
        pais: form.country,
        telefono: form.phone.trim(),
        sitio_web: form.website?.trim() || null,
        moneda: form.currency,
        regimen_tributario: form.taxRegime,
        maneja_inventario: form.managesInventory,
        maneja_nomina: form.managesPayroll,
        factura_electronica: form.invoicesElectronically,
        num_empleados: form.numEmployees,
        como_conocio: form.howHeard,
      })
      if (empresasErr) throw empresasErr

      setSuccessMsg('¡Cuenta creada! Revisa tu correo para confirmar (si aplica).')
      onSuccess?.()
    } catch (err) {
      const msg = err?.message || 'Error al registrarse'
      setErrors({ _form: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.logo}>ContaSys</div>
        <h1 className={styles.title}>Crea tu cuenta</h1>
        <p className={styles.subtitle}>Configura tu empresa en menos de 3 minutos</p>

        <div className={styles.progress}>
          {progress.map((p, idx) => {
            const completed = step > p.n
            const active = step === p.n
            return (
              <div key={p.n} className={styles.stepWrap}>
                <div
                  className={`${styles.step} ${completed ? styles.completed : ''} ${active ? styles.active : ''}`}
                >
                  {completed ? '✓' : p.n}
                </div>
                <div className={styles.stepLabel}>{p.label}</div>
                {idx < progress.length - 1 ? <div className={styles.connector} /> : null}
              </div>
            )
          })}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {errors._form ? (
            <div className={styles.errorBox} role="alert">
              <span className={styles.errorIcon} aria-hidden="true">
                !
              </span>
              <span>{errors._form}</span>
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Nombre completo</span>
                <input
                  className={styles.input}
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  type="text"
                  placeholder="Juan Pérez"
                  disabled={loading}
                />
                {errors.fullName ? <span className={styles.fieldError}>{errors.fullName}</span> : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  className={styles.input}
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  type="email"
                  placeholder="correo@empresa.com"
                  disabled={loading}
                />
                {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Contraseña</span>
                <input
                  className={styles.input}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                />
                {errors.password ? <span className={styles.fieldError}>{errors.password}</span> : null}

                <div className={styles.strength}>
                  <div className={styles.strengthBar}>
                    <span
                      className={`${styles.strengthFill} ${
                        strength.level === 1 ? styles.weak : strength.level === 2 ? styles.media : styles.strong
                      }`}
                      style={{ width: `${strength.level * 33}%` }}
                    />
                  </div>
                  <div className={styles.strengthLabel}>Fortaleza: {strength.label}</div>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Confirmar contraseña</span>
                <input
                  className={styles.input}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  type="password"
                  placeholder="Repite la contraseña"
                  disabled={loading}
                />
                {errors.confirmPassword ? (
                  <span className={styles.fieldError}>{errors.confirmPassword}</span>
                ) : null}
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Nombre de la empresa</span>
                <input
                  className={styles.input}
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  type="text"
                  placeholder="ContaSys S.A.S"
                  disabled={loading}
                />
                {errors.companyName ? <span className={styles.fieldError}>{errors.companyName}</span> : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>NIT / RUT / RUC</span>
                <input
                  className={styles.input}
                  value={form.nit}
                  onChange={(e) => setField('nit', e.target.value)}
                  type="text"
                  placeholder="123456789-0"
                  disabled={loading}
                />
              </label>

              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span className={styles.label}>Tipo de empresa</span>
                  <select
                    className={styles.select}
                    value={form.companyType}
                    onChange={(e) => setField('companyType', e.target.value)}
                    disabled={loading}
                  >
                    {COMPANY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Sector económico</span>
                  <select
                    className={styles.select}
                    value={form.sectorEconomic}
                    onChange={(e) => setField('sectorEconomic', e.target.value)}
                    disabled={loading}
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.sectorEconomic ? (
                    <span className={styles.fieldError}>{errors.sectorEconomic}</span>
                  ) : null}
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Dirección fiscal</span>
                <input
                  className={styles.input}
                  value={form.fiscalAddress}
                  onChange={(e) => setField('fiscalAddress', e.target.value)}
                  type="text"
                  placeholder="Calle 123 #45-67"
                  disabled={loading}
                />
                {errors.fiscalAddress ? (
                  <span className={styles.fieldError}>{errors.fiscalAddress}</span>
                ) : null}
              </label>

              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span className={styles.label}>Ciudad</span>
                  <input
                    className={styles.input}
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    type="text"
                    placeholder="Bogotá"
                    disabled={loading}
                  />
                  {errors.city ? <span className={styles.fieldError}>{errors.city}</span> : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>País</span>
                  <select
                    className={styles.select}
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    disabled={loading}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.country ? <span className={styles.fieldError}>{errors.country}</span> : null}
                </label>
              </div>

              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span className={styles.label}>Teléfono de contacto</span>
                  <input
                    className={styles.input}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    type="text"
                    placeholder="+57 300 000 0000"
                    disabled={loading}
                  />
                  {errors.phone ? <span className={styles.fieldError}>{errors.phone}</span> : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Sitio web (opcional)</span>
                  <input
                    className={styles.input}
                    value={form.website}
                    onChange={(e) => setField('website', e.target.value)}
                    type="text"
                    placeholder="https://tuempresa.com"
                    disabled={loading}
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span className={styles.label}>Moneda principal</span>
                  <select
                    className={styles.select}
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    disabled={loading}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.currency ? <span className={styles.fieldError}>{errors.currency}</span> : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Régimen tributario</span>
                  <select
                    className={styles.select}
                    value={form.taxRegime}
                    onChange={(e) => setField('taxRegime', e.target.value)}
                    disabled={loading}
                  >
                    {TAX_REGIMES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {errors.taxRegime ? <span className={styles.fieldError}>{errors.taxRegime}</span> : null}
                </label>
              </div>

              <div className={styles.radios}>
                <div className={styles.radioGroup}>
                  <div className={styles.radioTitle}>¿Maneja inventario?</div>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="inv"
                      checked={form.managesInventory === true}
                      onChange={() => setField('managesInventory', true)}
                      disabled={loading}
                    />
                    Sí
                  </label>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="inv"
                      checked={form.managesInventory === false}
                      onChange={() => setField('managesInventory', false)}
                      disabled={loading}
                    />
                    No
                  </label>
                </div>

                <div className={styles.radioGroup}>
                  <div className={styles.radioTitle}>¿Maneja nómina?</div>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="nom"
                      checked={form.managesPayroll === true}
                      onChange={() => setField('managesPayroll', true)}
                      disabled={loading}
                    />
                    Sí
                  </label>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="nom"
                      checked={form.managesPayroll === false}
                      onChange={() => setField('managesPayroll', false)}
                      disabled={loading}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className={styles.radios}>
                <div className={styles.radioGroup}>
                  <div className={styles.radioTitle}>¿Factura electrónicamente?</div>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="fe"
                      checked={form.invoicesElectronically === true}
                      onChange={() => setField('invoicesElectronically', true)}
                      disabled={loading}
                    />
                    Sí
                  </label>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="fe"
                      checked={form.invoicesElectronically === false}
                      onChange={() => setField('invoicesElectronically', false)}
                      disabled={loading}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span className={styles.label}>Número de empleados</span>
                  <select
                    className={styles.select}
                    value={form.numEmployees}
                    onChange={(e) => setField('numEmployees', e.target.value)}
                    disabled={loading}
                  >
                    {EMPLOYEE_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {errors.numEmployees ? (
                    <span className={styles.fieldError}>{errors.numEmployees}</span>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>¿Cómo nos conociste?</span>
                  <select
                    className={styles.select}
                    value={form.howHeard}
                    onChange={(e) => setField('howHeard', e.target.value)}
                    disabled={loading}
                  >
                    {HOW_KNOWED.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {errors.howHeard ? <span className={styles.fieldError}>{errors.howHeard}</span> : null}
                </label>
              </div>

              <label className={styles.terms}>
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => setField('acceptTerms', e.target.checked)}
                  disabled={loading}
                />
                <span>
                  Acepto los términos de uso y la política de privacidad
                </span>
              </label>
              {errors.acceptTerms ? <span className={styles.fieldError}>{errors.acceptTerms}</span> : null}
            </>
          ) : null}

          <div className={styles.actions}>
            {step > 1 ? (
              <button
                type="button"
                className={styles.back}
                onClick={() => {
                  setErrors({})
                  setStep((s) => s - 1)
                }}
                disabled={loading}
              >
                ← Atrás
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button type="submit" className={styles.next} disabled={loading}>
                Siguiente →
              </button>
            ) : (
              <button type="submit" className={styles.create} disabled={loading}>
                {loading ? 'Creando...' : '✓ Crear mi cuenta'}
              </button>
            )}
          </div>

          {successMsg ? <div className={styles.successMsg}>{successMsg}</div> : null}

          <button type="button" className={styles.switchLink} onClick={onSwitchToLogin} disabled={loading}>
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </form>
      </div>
    </div>
  )
}

