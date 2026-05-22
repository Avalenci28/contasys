import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Sistema contable para pequeños negocios · Barranquilla, Colombia
        </div>

        <h1 className={styles.heading}>
          Contabilidad <em>inteligente</em><br />
          para tu negocio
        </h1>

        <p className={styles.subheading}>
          Gestiona tu inventario, ventas y reportes financieros en un solo lugar.
          Sin complicaciones, sin errores manuales. Todo desde el navegador.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary}>
            Comenzar gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button className={styles.btnSecondary}>Ver demostración</button>
        </div>

        <div className={styles.trust}>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
            Sin tarjeta de crédito
          </span>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
            5 módulos incluidos
          </span>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
            Acceso desde cualquier dispositivo
          </span>
        </div>
      </div>
    </section>
  )
}
