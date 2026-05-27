import styles from './Sidebar.module.css'
import Logo from '../Logo'

const MENU_GROUPS = [
  {
    title: 'GESTIONA TU NEGOCIO',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { key: 'pos', label: 'Caja POS', icon: '🧾' },
      { key: 'ventas', label: 'Ventas', icon: '📊' },
      { key: 'cotizaciones', label: 'Cotizaciones', icon: '📋' },
      { key: 'facturacion', label: 'Facturación', icon: '🧾' },
    ],
  },
  {
    title: 'INVENTARIO',
    items: [
      { key: 'inventario', label: 'Inventario', icon: '📦' },
      { key: 'reportes', label: 'Reportes', icon: '📈' },
    ],
  },
  {
    title: 'FINANZAS',
    items: [
      { key: 'gastos', label: 'Gastos', icon: '💰' },
      { key: 'deudas', label: 'Deudas', icon: '💳' },
    ],
  },
  {
    title: 'CONTACTOS',
    items: [
      { key: 'clientes', label: 'Clientes', icon: '👥' },
      { key: 'proveedores', label: 'Proveedores', icon: '🚚' },
    ],
  },
  {
    title: 'OTROS',
    items: [
      { key: 'catalogo', label: 'Catálogo', icon: '🛍️' },
      { key: 'configuracion', label: 'Configuración', icon: '⚙️' },
    ],
  },
]



export default function Sidebar({ empresaNombre, usuarioNombre, active, onNavigate, onLogout }) {
  return (
    <aside className={styles.sidebar}>
      
      <div className={styles.headerFixed}>
        <div className={styles.logoWrap}>
          <div className={styles.brand}>ContaSys</div>
        </div>
        <div className={styles.company}>{empresaNombre || 'Tu empresa'}</div>
      </div>

      <nav className={styles.navScroll}>
        {MENU_GROUPS.map((group, groupIdx) => (
          <div key={group.title}>
            <div className={styles.sectionTitle}>{group.title}</div>
            {group.items.map((item) => (
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
            {groupIdx < MENU_GROUPS.length - 1 && (
              <div className={styles.groupSeparator} aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      <div className={styles.bottomFixed}>
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

