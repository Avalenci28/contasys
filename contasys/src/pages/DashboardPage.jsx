import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/dashboard/Sidebar'
import TopBar from '../components/dashboard/TopBar'
import DashboardHome from '../components/dashboard/modulos/DashboardHome'
import Inventario from '../components/dashboard/modulos/Inventario'
import Ventas from '../components/dashboard/modulos/Ventas'
import Clientes from '../components/dashboard/modulos/Clientes'
import Proveedores from '../components/dashboard/modulos/Proveedores'
import Gastos from '../components/dashboard/modulos/Gastos'
import Facturacion from '../components/dashboard/modulos/Facturacion'
import Reportes from '../components/dashboard/modulos/Reportes'
import Configuracion from '../components/dashboard/modulos/Configuracion'
import POS from '../components/dashboard/modulos/POS'
import Cotizaciones from '../components/dashboard/modulos/Cotizaciones'
import Deudas from '../components/dashboard/modulos/Deudas'
import Catalogo from '../components/dashboard/modulos/Catalogo'
import useToast from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'
import useDarkMode from '../hooks/useDarkMode'




export default function DashboardPage() {
  const { toasts, addToast, removeToast } = useToast()
  const { dark, toggleDark } = useDarkMode()
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true))


  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])




  const [empresaNombre, setEmpresaNombre] = useState('')
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [active, setActive] = useState('dashboard')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])



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
    ventas: 'Ventas',
    clientes: 'Clientes',
    proveedores: 'Proveedores',
    gastos: 'Gastos',
    facturacion: 'Facturación',
    reportes: 'Reportes',
    configuracion: 'Configuración',
  }


  return (
    <div>

      <Sidebar
        empresaNombre={empresaNombre}
        usuarioNombre={usuarioNombre}
        active={active}
        onNavigate={(key) => setActive(key)}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      <TopBar
        title={titles[active] || 'Dashboard'}
        onSearch={undefined}
        dark={dark}
        toggleDark={toggleDark}
      />



      {active === 'inventario' ? (
        <Inventario addToast={addToast} />
      ) : active === 'ventas' ? (
        <Ventas addToast={addToast} />
      ) : active === 'clientes' ? (
        <Clientes />
      ) : active === 'proveedores' ? (
        <Proveedores />
      ) : active === 'gastos' ? (
        <Gastos />
      ) : active === 'facturacion' ? (
        <Facturacion />
      ) : active === 'reportes' ? (
        <Reportes />
      ) : active === 'configuracion' ? (
        <Configuracion />
      ) : active === 'pos' ? (
        <POS addToast={addToast} />
      ) : active === 'cotizaciones' ? (
        <Cotizaciones addToast={addToast} />
      ) : active === 'deudas' ? (
        <Deudas addToast={addToast} />
      ) : active === 'catalogo' ? (
        <Catalogo />
      ) : (
        <DashboardHome />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />



    </div>
  )
}







