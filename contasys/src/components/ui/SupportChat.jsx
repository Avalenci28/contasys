import { useEffect, useMemo, useRef, useState } from 'react'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const QUICK_QUESTIONS = [
  '¿Cómo agrego un producto?',
  '¿Cómo registro una venta?',
  '¿Cómo creo una cotización?',
  '¿Cómo funciona la Caja POS?',
]

function formatTimestamp(ts) {
  try {
    return new Date(ts).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'baseline' }}>
      <span style={{ animation: 'dots 1.2s infinite' }}>.</span>
      <span style={{ animation: 'dots 1.2s infinite .2s' }}>.</span>
      <span style={{ animation: 'dots 1.2s infinite .4s' }}>.</span>
      <style>
        {`@keyframes dots { 0%, 20% { opacity: 0.2 } 40% { opacity: 1 } 100% { opacity: 0.2 } }`}
      </style>
    </span>
  )
}

export default function SupportChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const messagesEndRef = useRef(null)
  const chatScrollRef = useRef(null)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const systemText = useMemo(
    () => `Eres el asistente de soporte técnico de ContaSys, 
  un sistema de inventario y contabilidad para pequeños negocios 
  en Colombia. Ayudas a los usuarios con preguntas sobre cómo usar 
  el sistema: inventario, ventas, cotizaciones, deudas, reportes, 
  caja POS y catálogo virtual. Responde siempre en español, 
  de forma amable, clara y concisa. Si no sabes algo, 
  di que contacten a soporte@contasys.co`,
    [],
  )

  useEffect(() => {
    if (!open) return

    if (!hasInitialized) {
      setMessages([
        {
          role: 'assistant',
          content:
            '¡Hola! 👋 Soy el asistente de ContaSys. ¿En qué puedo ayudarte hoy? Puedo ayudarte con inventario, ventas, cotizaciones, reportes y más.',
          ts: Date.now(),
        },
      ])
      setHasInitialized(true)
    }
  }, [open, hasInitialized])

  useEffect(() => {
    if (!open) return
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, open, loading])

  async function callAnthropic(nextMessages) {
    if (!apiKey) {
      throw new Error(
        'Falta la variable de entorno VITE_ANTHROPIC_API_KEY. Contacta al administrador para configurarla.',
      )
    }

    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: systemText,
        messages: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || 'Error llamando a Anthropic'
      throw new Error(msg)
    }

    const assistantText = data?.content?.[0]?.text
    if (!assistantText) {
      throw new Error('Respuesta inválida de Anthropic')
    }

    return assistantText
  }

  async function handleSend(raw) {
    const text = (raw ?? '').trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text, ts: Date.now() }

    setInput('')
    setLoading(true)

    // 1) Agrega mensaje del usuario
    const next = [...messages, userMsg]
    setMessages(next)

    try {
      // 2) Escribiendo... (render por loading)
      // 3) Llama API con historial completo
      const assistantText = await callAnthropic(next)

      // 4) Agrega respuesta
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantText, ts: Date.now() },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            e?.message ||
            'No pude completar tu solicitud en este momento. Si el problema continúa, contáctanos a soporte@contasys.co',
          ts: Date.now(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleQuickQuestion(q) {
    setOpen(true)
    handleSend(q)
  }

  return (
    <>
      {/* Floating button */}
      {!open ? (
        <button
          type="button"
          aria-label="Abrir asistente"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 999,
            background: '#0F6E56',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            boxShadow: '0 14px 40px rgba(0,0,0,.18)',
            transition: 'transform .18s ease',
            fontSize: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
          }}
        >
          💬
        </button>
      ) : null}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 380,
          height: 520,
          zIndex: 9998,
          transformOrigin: 'bottom right',
          transition: 'transform 0.3s ease',
          transform: open ? 'scaleY(1)' : 'scaleY(0)',
          display: open ? 'block' : 'none',
        }}
        aria-hidden={!open}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--bg-card, #fff)',
            borderRadius: 16,
            boxShadow: '0 18px 60px rgba(0,0,0,.25)',
            border: '1px solid rgba(4,52,44,.10)',
            overflow: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          <div
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 14px',
              background: 'linear-gradient(90deg, rgba(15,110,86,.10), rgba(15,110,86,.06))',
              borderBottom: '1px solid rgba(4,52,44,.10)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 1000, color: '#0F6E56', fontSize: 14 }}>
                🤖 Asistente ContaSys
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
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

          <div
            ref={chatScrollRef}
            style={{
              height: 520 - 56 - 72,
              overflowY: 'auto',
              padding: 14,
              background: 'rgba(15,110,86,.03)',
            }}
          >
            {/* Messages */}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={`${m.ts ?? idx}-${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                    animation: 'fadeIn .2s ease',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      background: isUser ? '#0F6E56' : 'rgba(200,200,200,.18)',
                      color: isUser ? '#fff' : '#212529',
                      padding: '10px 12px',
                      borderRadius: 16,
                      borderBottomRightRadius: isUser ? 4 : 16,
                      borderBottomLeftRadius: !isUser ? 4 : 16,
                      boxShadow: '0 8px 22px rgba(0,0,0,.05)',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 11, opacity: isUser ? 0.85 : 0.6, marginTop: 6 }}>
                      {formatTimestamp(m.ts)}
                    </div>
                  </div>
                </div>
              )
            })}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                <div
                  style={{
                    maxWidth: '85%',
                    background: 'rgba(200,200,200,.18)',
                    color: '#212529',
                    padding: '10px 12px',
                    borderRadius: 16,
                    borderBottomLeftRadius: 4,
                    boxShadow: '0 8px 22px rgba(0,0,0,.05)',
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>
                    Escribiendo <LoadingDots />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Quick questions (only right after welcome, when single assistant message exists) */}
            {hasInitialized && !loading && messages.filter((m) => m.role === 'assistant').length >= 1 ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, marginBottom: 8 }}>
                  Preguntas rápidas:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickQuestion(q)}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(4,52,44,.12)',
                        borderRadius: 999,
                        padding: '8px 10px',
                        fontSize: 12.5,
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              height: 72,
              padding: 12,
              borderTop: '1px solid rgba(4,52,44,.10)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(input)
                }
              }}
              placeholder="Escribe tu pregunta..."
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(4,52,44,.12)',
                padding: '0 12px',
                fontSize: 13.5,
                fontWeight: 700,
                outline: 'none',
                background: '#fff',
                color: 'inherit',
              }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => handleSend(input)}
              style={{
                height: 44,
                width: 44,
                borderRadius: 14,
                background: '#0F6E56',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 1000,
                boxShadow: '0 10px 30px rgba(15,110,86,.25)',
              }}
              disabled={loading}
              aria-label="Enviar"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </>
  )
}

