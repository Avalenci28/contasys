import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function DashboardPage() {
  const [empresaNombre, setEmpresaNombre] = useState('')

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) return

      const { data, error } = await supabase
        .from('empresas')
        .select('nombre_empresa')
        .eq('user_id', userId)
        .maybeSingle()

      if (!mounted) return
      if (!error) setEmpresaNombre(data?.nombre_empresa ?? '')
    })()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Dashboard</h1>
      <p style={{ opacity: 0.8, marginTop: 8 }}>
        {empresaNombre ? `Empresa: ${empresaNombre}` : 'Cargando datos de empresa...'}
      </p>
      <p style={{ opacity: 0.7, marginTop: 16 }}>
        Layout y módulos completos se implementarán en el Paso 4 y siguientes.
      </p>
    </div>
  )
}

