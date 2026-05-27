import { useEffect, useMemo, useState } from 'react'

export default function CookieBanner() {
  const [shouldShow, setShouldShow] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [toggleAnalyticas, setToggleAnalyticas] = useState(true)
  const [toggleMarketing, setToggleMarketing] = useState(false)

  useEffect(() => {
    try {
      const existing = localStorage.getItem('contasys_cookies')
      if (existing) {
        setShouldShow(false)
        return
      }
    } catch {
      // Si localStorage falla, mostramos el banner para no romper el flujo.
    }
    setShouldShow(true)
  }, [])

  const closeBanner = () => {
    setShouldShow(false)
    setIsModalOpen(false)
  }

  const setDecision = (value) => {
    try {
      localStorage.setItem('contasys_cookies', value)
    } catch {
      // noop
    }
    closeBanner()
  }

  const savePreferences = () => {
    try {
      localStorage.setItem(
        'contasys_cookies',
        JSON.stringify({
          essential: true,
          analytics: toggleAnalyticas,
          marketing: toggleMarketing,
        })
      )
    } catch {
      // noop
    }
    closeBanner()
  }

  const privacyLabel = useMemo(() => 'Política de Privacidad', [])

  if (!shouldShow) return null

  return (
    <>
      {/* Banner */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: '#04342C',
          color: '#fff',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            minWidth: 280,
            flex: '1 1 520px',
          }}
        >
          <div style={{ fontSize: 34, lineHeight: 1 }}>🍪</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Usamos cookies</div>

            <div style={{ fontSize: 13.5, lineHeight: 1.45, maxWidth: 720 }}>
              Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico
              y personalizar el contenido. Puedes aceptar todas, rechazar las no esenciales o
              personalizar tu elección. Consulta nuestra{' '}
              <span
                onClick={() => {
                  // Placeholder UX: no se especificó ruta. Se puede integrar a la política en el futuro.
                  window.open('#', '_blank', 'noopener,noreferrer')
                }}
                style={{
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
                aria-label={privacyLabel}
              >
                Política de Privacidad
              </span>
              .
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flex: '0 1 auto',
          }}
        >
          <button
            type="button"
            onClick={() => setDecision('essential')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 750,
            }}
          >
            Rechazar no esenciales
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Personalizar
          </button>

          <button
            type="button"
            onClick={() => setDecision('all')}
            style={{
              background: '#0F6E56',
              border: 'none',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              cursor: 'pointer',
              fontWeight: 900,
            }}
          >
            Aceptar todas ✓
          </button>
        </div>
      </div>

      {/* Modal de personalización */}
      {isModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Personaliza tus cookies"
        >
          <div
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 520,
              color: '#0b0f10',
              boxShadow: '0 18px 60px rgba(0,0,0,.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>Personaliza tus cookies</div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar"
                style={{
                  height: 34,
                  width: 34,
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,.10)',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 1000,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ height: 18 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Esenciales */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: '#0F6E56',
                    position: 'relative',
                    cursor: 'not-allowed',
                    transition: 'background 0.2s',
                    flex: '0 0 auto',
                  }}
                  aria-label="Cookies esenciales"
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 22,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 950 }}>Cookies esenciales</div>
                  <div style={{ fontSize: 13.5, opacity: 0.75, marginTop: 4 }}>
                    Necesarias para el funcionamiento básico del sitio
                  </div>
                </div>
              </div>

              {/* Analíticas */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  onClick={() => setToggleAnalyticas((v) => !v)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: toggleAnalyticas ? '#0F6E56' : '#ccc',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flex: '0 0 auto',
                  }}
                  role="switch"
                  aria-checked={toggleAnalyticas}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: toggleAnalyticas ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 950 }}>Cookies analíticas</div>
                  <div style={{ fontSize: 13.5, opacity: 0.75, marginTop: 4 }}>
                    Nos ayudan a entender cómo usas el sitio
                  </div>
                </div>
              </div>

              {/* Marketing */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  onClick={() => setToggleMarketing((v) => !v)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: toggleMarketing ? '#0F6E56' : '#ccc',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flex: '0 0 auto',
                  }}
                  role="switch"
                  aria-checked={toggleMarketing}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: toggleMarketing ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 950 }}>Cookies de marketing</div>
                  <div style={{ fontSize: 13.5, opacity: 0.75, marginTop: 4 }}>
                    Para mostrarte contenido personalizado
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 18 }} />

            <button
              type="button"
              onClick={savePreferences}
              style={{
                width: '100%',
                background: '#0F6E56',
                border: 'none',
                color: '#fff',
                borderRadius: 12,
                padding: '12px 16px',
                fontWeight: 950,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(15,110,86,.25)',
              }}
            >
              Guardar preferencias
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

