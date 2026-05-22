import { useState } from 'react'
import styles from './Navbar.module.css'
import Logo from './Logo'

const NAV_LINKS = [
  { label: 'Módulos',    href: '#modulos' },
  { label: 'Reportes',   href: '#stats' },
  { label: 'Inventario', href: '#features' },
  { label: 'Soporte',    href: '#cta' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <Logo />

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href} className={styles.link} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button className={styles.btnOutline}>Iniciar sesión</button>
          <button className={styles.btnPrimary}>Comenzar gratis</button>
        </div>

        <button
          className={styles.hamburger}
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>
      </nav>
    </header>
  )
}
