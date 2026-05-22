import styles from './Stats.module.css'

const STATS = [
  { value: '60%', label: 'Procesos automatizados', desc: 'de las tareas manuales eliminadas' },
  { value: '70%', label: 'Reducción de errores',   desc: 'en comparación con registros manuales' },
  { value: '5',   label: 'Módulos integrados',     desc: 'listos para usar desde el primer día' },
  { value: '2',   label: 'Roles de acceso',         desc: 'con permisos diferenciados por perfil' },
]

export default function Stats() {
  return (
    <section className={styles.section} id="stats">
      <div className={styles.container}>
        <p className={styles.eyebrow}>Resultados del sistema</p>
        <h2 className={styles.heading}>Impacto real en tu negocio</h2>
        <div className={styles.grid}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.card}>
              <p className={styles.value}>{stat.value}</p>
              <p className={styles.label}>{stat.label}</p>
              <p className={styles.desc}>{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
