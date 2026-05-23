import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data?.session ?? null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      setSession(_session)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  if (loading) return <div />
  if (!session) return <Navigate to="/" replace />

  return children
}

