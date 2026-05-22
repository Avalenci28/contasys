import styles from './Logo.module.css'

export default function Logo() {
  return (
    <a href="#" className={styles.logo} aria-label="ContaSys inicio">
      <div className={styles.icon} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span className={styles.text}>
        Conta<span className={styles.accent}>Sys</span>
      </span>
    </a>
  )
}
