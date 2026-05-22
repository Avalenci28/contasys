import { useMemo, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import DashboardPreview from './components/DashboardPreview'
import Features from './components/Features'
import Modules from './components/Modules'
import Stats from './components/Stats'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'
import Modal from './components/Modal'
import { supabase } from './supabaseClient'
import { upsertProfile } from './supabaseProfile'

function isValidEmail(value) {

  return /.+@.+\..+/.test(value)
}


export default function App() {
  const [activePage, setActivePage] = useState('home')

  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState({})
  const [loginSuccess, setLoginSuccess] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [registerErrors, setRegisterErrors] = useState({})
  const [registerSuccess, setRegisterSuccess] = useState('')

  const scrollToId = (id) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const closeAllModals = () => {
    setIsLoginOpen(false)
    setIsRegisterOpen(false)
  }

  const openLogin = () => {
    setLoginErrors({})
    setLoginSuccess('')
    setIsLoginOpen(true)
  }

  const openRegister = () => {
    setRegisterErrors({})
    setRegisterSuccess('')
    setIsRegisterOpen(true)
  }

  const modalContent = useMemo(() => {
    return {
      login: (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const nextErrors = {}

            if (!loginEmail.trim()) nextErrors.email = 'Email es requerido'
            else if (!isValidEmail(loginEmail)) nextErrors.email = 'Email inválido'

            if (!loginPassword.trim()) nextErrors.password = 'Contraseña es requerida'

            setLoginErrors(nextErrors)

            if (Object.keys(nextErrors).length === 0) {
              ;(async () => {
                try {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: loginEmail.trim(),
                    password: loginPassword,
                  })

                  if (error) throw error

                  setLoginSuccess('Inicio de sesión exitoso.')
                  alert('Inicio de sesión exitoso.')
                  closeAllModals()
                } catch (err) {
                  const msg = err?.message || 'Error al iniciar sesión'
                  setLoginErrors({ _form: msg })
                }
              })()
            }
          }}
        >

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                placeholder="tucorreo@ejemplo.com"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {loginErrors.email ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{loginErrors.email}</p>
              ) : null}
              {loginErrors._form ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12, fontWeight: 700 }}>
                  {loginErrors._form}
                </p>
              ) : null}
            </div>


            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {loginErrors.password ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{loginErrors.password}</p>
              ) : null}
            </div>

            {loginSuccess ? (
              <p style={{ margin: 0, color: '#5CFFB6', fontSize: 13, fontWeight: 700 }}>{loginSuccess}</p>
            ) : null}

            <button
              type="submit"
              style={{
                marginTop: 6,
                height: 46,
                borderRadius: 12,
                border: '1px solid rgba(15,110,86,.5)',
                background: '#0F6E56',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Entrar
            </button>
          </div>
        </form>
      ),

      register: (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const nextErrors = {}

            if (!registerName.trim()) nextErrors.name = 'Nombre es requerido'

            if (!registerEmail.trim()) nextErrors.email = 'Email es requerido'
            else if (!isValidEmail(registerEmail)) nextErrors.email = 'Email inválido'

            if (!registerPassword.trim()) nextErrors.password = 'Contraseña es requerida'

            if (!registerConfirm.trim()) nextErrors.confirm = 'Confirmar contraseña es requerida'
            else if (registerPassword !== registerConfirm) nextErrors.confirm = 'Las contraseñas no coinciden'

            setRegisterErrors(nextErrors)

            if (Object.keys(nextErrors).length === 0) {
              ;(async () => {
                try {
                  const { data, error } = await supabase.auth.signUp({
                    email: registerEmail.trim(),
                    password: registerPassword,
                  })

                  if (error) throw error

                  const userId = data?.user?.id

                  await upsertProfile({
                    supabase,
                    userId,
                    name: registerName.trim(),
                    email: registerEmail.trim(),
                  })


                  setRegisterSuccess('Registro exitoso. Revisa tu correo si aplica verificación.')
                  alert('Registro exitoso. Revisa tu correo si aplica verificación.')
                  closeAllModals()
                } catch (err) {
                  const msg = err?.message || 'Error al registrarse'
                  setRegisterErrors({ _form: msg })
                }
              })()
            }
          }}
        >

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="reg-name">Nombre</label>
              <input
                id="reg-name"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                type="text"
                placeholder="Tu nombre"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {registerErrors.name ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{registerErrors.name}</p>
              ) : null}
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                type="email"
                placeholder="tucorreo@ejemplo.com"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {registerErrors.email ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{registerErrors.email}</p>
              ) : null}
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="reg-password">Contraseña</label>
              <input
                id="reg-password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {registerErrors.password ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{registerErrors.password}</p>
              ) : null}
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor="reg-confirm">Confirmar contraseña</label>
              <input
                id="reg-confirm"
                value={registerConfirm}
                onChange={(e) => setRegisterConfirm(e.target.value)}
                type="password"
                placeholder="••••••••"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              {registerErrors.confirm ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12 }}>{registerErrors.confirm}</p>
              ) : null}
              {registerErrors._form ? (
                <p style={{ margin: 0, color: '#ff6b6b', fontSize: 12, fontWeight: 700 }}>
                  {registerErrors._form}
                </p>
              ) : null}
            </div>


            {registerSuccess ? (
              <p style={{ margin: 0, color: '#5CFFB6', fontSize: 13, fontWeight: 700 }}>{registerSuccess}</p>
            ) : null}

            <button
              type="submit"
              style={{
                marginTop: 6,
                height: 46,
                borderRadius: 12,
                border: '1px solid rgba(15,110,86,.5)',
                background: '#0F6E56',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Registrarse
            </button>
          </div>
        </form>
      ),
    }
  }, [
    loginEmail,
    loginPassword,
    loginErrors,
    loginSuccess,
    registerName,
    registerEmail,
    registerPassword,
    registerConfirm,
    registerErrors,
    registerSuccess,
  ])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
      />

      <main style={{ flex: 1 }}>
        <Hero
          onOpenRegister={openRegister}
          onScrollDemo={() => scrollToId('demo')}
        />

        <DashboardPreview />
        <Features />
        <Modules />
        <Stats />

        <CallToAction
          onOpenRegister={openRegister}
          onScrollModules={() => scrollToId('modulos')}
        />
      </main>

      <Footer
        onScroll={(id) => scrollToId(id)}
      />

      <Modal
        isOpen={isLoginOpen}
        title="Iniciar sesión"
        onClose={closeAllModals}
      >
        {modalContent.login}
      </Modal>

      <Modal
        isOpen={isRegisterOpen}
        title="Registro"
        onClose={closeAllModals}
      >
        {modalContent.register}
      </Modal>
    </div>
  )
}

