import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function useEmpresa() {
  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) {
        if (mounted) {
          setEmpresa(null)
          setLoading(false)
        }
        return
      }

      // Toma la primera empresa asociada al usuario
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (!mounted) return
      if (!error) setEmpresa(data)
      setLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  return { empresa, loading }
}

