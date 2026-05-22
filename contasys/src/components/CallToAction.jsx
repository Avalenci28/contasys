import styles from './CallToAction.module.css'

export default function CallToAction() {
  return (
    <section className={styles.section} id="cta">
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>¿Listo para empezar?</p>
          <h2 className={styles.heading}>
            Empieza a controlar tu<br />negocio hoy mismo
          </h2>
          <p className={styles.subheading}>
            Sin instalaciones complicadas. Sin tarjeta de crédito.
            Accede desde cualquier dispositivo con conexión a internet.
          </p>
          <div className={styles.actions}>
            <button className={styles.btnPrimary}>
              Crear cuenta gratuita
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className={styles.btnOutline}>Conocer los módulos</button>
          </div>
          <div className={styles.checks}>
            {['Configuración en minutos', 'Soporte incluido', 'Datos seguros y respaldados'].map((item) => (
              <span key={item} className={styles.checkItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
