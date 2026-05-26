import styles from './Sidebar.module.css'
import Logo from '../Logo'

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'inventario', label: 'Inventario', icon: '📦' },
  { key: 'ventas', label: 'Ventas', icon: '💰' },
  { key: 'facturacion', label: 'Facturación', icon: '🧾' },
  { key: 'clientes', label: 'Clientes', icon: '👥' },
  { key: 'proveedores', label: 'Proveedores', icon: '🏭' },
  { key: 'gastos', label: 'Gastos', icon: '💼' },
  { key: 'reportes', label: 'Reportes', icon: '📈' },
  { key: 'configuracion', label: 'Configuración', icon: '⚙️' },
  { key: 'pos', label: '🧾 Caja POS', icon: '🧾' },
  { key: 'cotizaciones', label: '📋 Cotizaciones', icon: '📋' },
  { key: 'deudas', label: '💳 Deudas', icon: '💳' },
  { key: 'catalogo', label: '🛍️ Catálogo', icon: '🛍️' },
]


export default function Sidebar({ empresaNombre, usuarioNombre, active, onNavigate, onLogout }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <div className={styles.logoWrap}>
          <Logo size={30} />
          <div className={styles.brand}>ContaSys</div>
        </div>

        <div className={styles.company}>{empresaNombre || 'Tu empresa'}</div>

        <nav className={styles.nav}>
          {MENU.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${active === item.key ? styles.navItemActive : ''}`}
              onClick={() => onNavigate?.(item.key)}
            >
              <span className={styles.navIcon} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.bottom}>
        <div className={styles.userRow}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.userMeta}>
            <div className={styles.userName}>{usuarioNombre || 'Usuario'}</div>
          </div>
        </div>

        <button type="button" className={styles.logout} onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

