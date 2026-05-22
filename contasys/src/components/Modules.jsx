import { useState } from 'react'
import styles from './Modules.module.css'

const MODULES = [
  {
    number: '01',
    title: 'Gestión de productos',
    desc: 'Registra, categoriza y administra todos tus productos con control de precios, stock mínimo y máximo. Recibe alertas automáticas cuando el inventario baje del umbral definido.',
    tags: ['Categorías', 'Precios', 'Stock automático', 'Alertas'],
  },
  {
    number: '02',
    title: 'Control de ventas',
    desc: 'Registra cada transacción de venta con actualización automática del inventario disponible. Genera comprobantes y lleva el historial completo de operaciones.',
    tags: ['Comprobantes', 'Historial', 'Stock automático'],
  },
  {
    number: '03',
    title: 'Administración de usuarios',
    desc: 'Crea y gestiona cuentas de acceso con niveles de permiso diferenciados. Rol administrador con acceso total y rol usuario con acceso operativo limitado.',
    tags: ['Rol administrador', 'Rol usuario', 'Permisos'],
  },
  {
    number: '04',
    title: 'Reportes básicos',
    desc: 'Genera tres tipos de reportes exportables: ventas por período, estado del inventario y análisis de productos más vendidos para apoyar la toma de decisiones.',
    tags: ['Ventas', 'Inventario', 'Exportable'],
  },
  {
    number: '05',
    title: 'Dashboard estadístico',
    desc: 'Visualización en tiempo real de indicadores comerciales clave. Integración con Power BI para dashboards dinámicos con actualización automática de datos.',
    tags: ['Power BI', 'Tiempo real', 'KPIs'],
  },
]

export default function Modules() {
  const [active, setActive] = useState(0)

  return (
    <section className={styles.section} id="modulos">
      <div className={styles.container}>
        <p className={styles.sectionLabel}>Módulos del sistema</p>
        <h2 className={styles.sectionTitle}>5 módulos listos para usar</h2>

        <div className={styles.layout}>
          {/* Left: list */}
          <ul className={styles.list} role="tablist">
            {MODULES.map((mod, i) => (
              <li key={mod.number}>
                <button
                  role="tab"
                  aria-selected={active === i}
                  className={`${styles.listItem} ${active === i ? styles.listItemActive : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className={`${styles.num} ${active === i ? styles.numActive : ''}`}>
                    {mod.number}
                  </span>
                  <span className={styles.listTitle}>{mod.title}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Right: detail */}
          <div className={styles.detail} role="tabpanel">
            <p className={styles.detailNum}>{MODULES[active].number}</p>
            <h3 className={styles.detailTitle}>{MODULES[active].title}</h3>
            <p className={styles.detailDesc}>{MODULES[active].desc}</p>
            <div className={styles.tags}>
              {MODULES[active].tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
