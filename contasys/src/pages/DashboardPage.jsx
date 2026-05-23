import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import DashboardHome from '../components/dashboard/modulos/DashboardHome'
import Inventario from '../components/dashboard/modulos/Inventario'

export default function DashboardPage() {
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [active, setActive] = useState('dashboard')

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) return

      const [{ data: profile, error: profErr }, { data: empresa, error: empErr }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', userId).maybeSingle(),
        supabase.from('empresas').select('nombre_empresa').eq('user_id', userId).limit(1).maybeSingle(),
      ])

      if (!mounted) return
      if (!profErr) setUsuarioNombre(profile?.name ?? '')
      if (!empErr) setEmpresaNombre(empresa?.nombre_empresa ?? '')
    })()

    return () => {
      mounted = false
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/' // simple redirect
  }

  const titles = {
    dashboard: 'Dashboard',
    inventario: 'Inventario',
  }

  return (
    <div>
      <Sidebar
        empresaNombre={empresaNombre}
        usuarioNombre={usuarioNombre}
        active={active}
        onNavigate={(key) => setActive(key)}
        onLogout={handleLogout}
      />

      <TopBar title={titles[active] || 'Dashboard'} />

      {active === 'inventario' ? <Inventario /> : <DashboardHome />}
    </div>
  )
}



